import bcrypt from 'bcryptjs';
import { ErrorHandler } from '../handlers/error-handlers';


export class BcryptService {
  private readonly SALT_ROUNDS = 10;
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      ErrorHandler.handle(Error, 'Password hashing failed');
    }
  }
  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      ErrorHandler.handle(error, 'Password comparsion failed');
    }
  }
}