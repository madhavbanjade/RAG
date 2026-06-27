import { Injectable, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';


@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly client = new QdrantClient({
    host: 'localhost',
    port: 6333,
  })

 
  
  
 //check collections get
  async onModuleInit() {
    await this.creatCollection(); 
    const collections = await this.client.getCollections();

    console.log(collections)
  }


  //create collections

async creatCollection(){
  try {
    await this.client.createCollection('documents', {
      vectors:{
        size: 1024, 
        distance: 'Cosine'
      }
    })
    console.log('Collection Created')
  } catch (error) {
    console.log('Collection already exists!')
  }
}



private toUUID(mongoId: string): string {
  const padded = mongoId.padEnd(32, '0');
  return `${padded.slice(0,8)}-${padded.slice(8,12)}-${padded.slice(12,16)}-${padded.slice(16,20)}-${padded.slice(20,32)}`;
}

//store embeddings
async storeEmbedding(
  chunkId: string,
  documentId: string,
  vector: number[],
  content: string,
){

  await this.client.upsert('documents', {
    wait: true,
    points:[
    {
      id: this.toUUID(chunkId),
      vector,
      payload:{
        documentId,
        chunkId,
        content,
      }
    }
    ]
  })
  return true;
}


//get points
async getPoints(){
  return this.client.scroll('documents', {
    limit: 10,
    with_payload: true,
    with_vector: false
  })
}

//search similarity
async search(vector: number[]){
  const results = await this.client.query('documents', {
    query: vector,
    limit:10,
    with_payload: true
  })

  if (!results.points.length) {
    return [];
  }
  console.log("========== SEARCH ==========");
console.log("Total Results:", results.points.length);

  const bestScore = results.points[0].score;
//Math.max(0.29, 0.45)
const threshold = Math.max(bestScore - 0.05, 0.45) 

  const filtered = results.points.filter(
    point => point.score >= threshold
  )

console.log("After Threshold:", filtered.length);

  
  const seen = new Set<string>();
  const unique: typeof filtered = [];
  for (const point of filtered){
    const content = point.payload?.content;
    if(typeof content !== 'string' || !content)
      continue;
    if(seen.has(content))
      continue;
    seen.add(content);
    unique.push(point)
  }
  console.log("After Deduplication:", unique.length);

  const selected = unique.slice(0,5)
  console.log("Final Selected:", selected.length);


  selected.forEach((item, index) => {
  console.log(
    `${index + 1}. Score=${item.score.toFixed(3)} | Chunk=${item.payload?.chunkId}`
  );
});

console.log("============================");

  return selected.map((item) => ({
    score: item.score,
    documentId: item.payload?.documentId,
    chunkId: item.payload?.chunkId,
    content: item.payload?.content
  }))

  

  
}


async deleteCollection() {
  try {
    const result = await this.client.deleteCollection('documents');

    return {
      success: true,
      message: 'Collection deleted successfully',
      result,
    };
  } catch (error) {
    throw new Error(`Failed to delete collection: ${error}`);
  }
}
 


}
