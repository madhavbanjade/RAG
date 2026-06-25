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
    limit: 3,
    with_payload: true
  })
  return results.points.filter((item) => item.score > 0.5).map((item) => ({
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
