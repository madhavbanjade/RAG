import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CreateUserDto,
  forgetPasswordDto,
  LoginUserDto,
  resetPasswordDto,
} from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schema/users.schema';
import { ErrorHandler } from 'src/common/handlers/error-handlers';
import {
  ApiResponse,
  SuccessResponseHandler,
} from 'src/common/handlers/success-handlers';
import { BcryptService } from 'src/common/services/bcrypt.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { MailService } from 'src/common/services/mail/mail.service';
import { hash, randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User')
    private readonly userModel: Model<User>,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  //helpers to generate otp code
  private generateResetCode(): string {
    return ((randomBytes(3).readUIntBE(0, 3) % 900000) + 100000).toString();
  }
 //register 
  async register(createUserDto: CreateUserDto): Promise<any> {
    return ErrorHandler.execute(async () => {
      const { name, email, password, role } = createUserDto;

      const existingUser = await this.userModel.findOne({
        email,
      });

      if (existingUser) throw new BadRequestException('Email already exists');

      const hashedPassword = await this.bcryptService.hashPassword(password);

      const registerOtp = this.generateResetCode();
      const hashedOtp = await this.bcryptService.hashPassword(registerOtp);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const newUser = await this.userModel.create({
        name,
        email,
        password: hashedPassword,
        role,
        isEmailVerified: false,
        registerOtp: hashedOtp,
        registerOtpExpires: expiresAt,
      });

      await this.mailService.sendOtp(email, registerOtp);

      return {
        success: true,
        message: 'Registration OTP sent to your email. Please verify to complete registration.',
        data: { email },
      };
    }, 'Failed to register user');
  }

  //verify email via otp
  async verifyEmail(email: string, otp: string): Promise<any> {
    return ErrorHandler.execute(async () => {
      const user = await this.userModel.findOne({ email });

      if (!user) {
        throw ErrorHandler.notFound('User');
      }

      if (user.isEmailVerified) {
        throw new BadRequestException('Email already verified');
      }

      if (!user.registerOtp) {
        throw ErrorHandler.invalidCredentials('No OTP request found');
      }

      const isOtpValid = await this.bcryptService.comparePassword(
        otp,
        user.registerOtp
      );

      if (!isOtpValid) {
        throw ErrorHandler.invalidCredentials('OTP is not valid');
      }

      if (!user.registerOtpExpires || user.registerOtpExpires < new Date()) {
        throw ErrorHandler.invalidCredentials('OTP Expired');
      }

      user.isEmailVerified = true;
      user.registerOtp = null;
      user.registerOtpExpires = null;

      await user.save();

      return {
        success: true,
        message: 'Email verified successfully. You can now login!',
        data: { email: user.email },
      };
    }, 'Failed to verify email');
  }

  //only verifed email can login
  async login(loginUserDto: LoginUserDto): Promise<any> {
    return ErrorHandler.execute(async () => {
      const { email, password } = loginUserDto;
      console.log('email => ', email);

      const user = await this.userModel.findOne({
        email,
      });

      if (!user) {
        throw new UnauthorizedException('User not found !');
      }

      if (!user.isEmailVerified) {
        throw new UnauthorizedException('Please verify your email first');
      }

      const isValid = await this.bcryptService.comparePassword(
        password,
        user.password,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const jwtPayload = {
        id: user.id,
        name: user.name || '',
        email: user.email,
        role: user.role,
      };

      const access_token = await this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.getOrThrow<string>('jwtAccessSecret'),
        expiresIn: '15m',
      });
      const refresh_token = await this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.getOrThrow<string>('jwtRefreshSecret'),
        expiresIn: '7d',
      });

      return {
        success: true,
        message: 'Login successfully',
        data: {
          ...jwtPayload,
          access_token,
          refresh_token,
        },
      };
    }, 'Failed to logged in');
  }

  //get all users by admin
  async findAll(): Promise<any> {
    return ErrorHandler.execute(async () => {
      const users = await this.userModel.find().select('-password');

      return SuccessResponseHandler.retrived('user', users);
    }, 'Failed to get users');
  }

  //find only one users data 
  async findOne(id: string): Promise<any> {
    return ErrorHandler.execute(
      async () => {
        const user = await this.userModel.findById(id).select('-password');

        if (!user) throw ErrorHandler.notFound(`User not found with the ${id}`);
        return SuccessResponseHandler.retrived('User', user);
      },

      'Failed to get user',
    );
  }

  //update your data
  async update(id: string, data: UpdateUserDto): Promise<any> {
    return ErrorHandler.execute(async () => {
      const userExists = await this.userModel.findById(id);
      if (!userExists)
        throw ErrorHandler.notFound("The user wasn't found on the platform");

      //check updatd email is already exists or nots
      if (data.email && data.email !== userExists.email) {
        const emailExists = await this.userModel.findOne({
          email: data.email,
        });
        if (emailExists) {
          throw ErrorHandler.alreadyExists('Email already exists!');
        }
      }
      //handle updated passwords
      if (data.password?.trim()) {
        data.password = await this.bcryptService.hashPassword(data.password);
      }
      const updatePayload: any = { ...data };

      const updatedUser = await this.userModel
        .findByIdAndUpdate(userExists._id, updatePayload, { new: true })
        .select('-password');

      if (!updatedUser) {
        throw ErrorHandler.serviceUnavailable(
          'Unable to update the user info!',
        );
      }

      return SuccessResponseHandler.updated('user', updatedUser);
    }, 'Faild to update user');
  }

  //remove the users from db
  async remove(id: string): Promise<any> {
    return ErrorHandler.execute(async () => {
      const userExists = await this.userModel.findById(id);
      if (!userExists) {
        throw ErrorHandler.notFound('User not found on the platform');
      }

      const deleteUser = await this.userModel.findByIdAndDelete(userExists._id);
      if (!deleteUser) {
        throw ErrorHandler.serviceUnavailable('Unable to delete the user !');
      }
      return SuccessResponseHandler.deleted('User', deleteUser);
    }, 'Failed to delete user');
  }

  //logout your id
  async logout(id: string): Promise<any> {
    return ErrorHandler.execute(async () => {
      const userExists = await this.userModel.findById(id);
      if (!userExists) {
        throw ErrorHandler.notFound('User not found !');
      }

      return {
        success: true,
        message: 'Logged out successfully',
      };
    }, 'Failed to logout');
  }

//if you forget your password
  async forgetPassword(forgetPasswordData: forgetPasswordDto): Promise<any> {
    return ErrorHandler.execute(async () => {
      const user = await this.userModel.findOne({
        email: forgetPasswordData.email,
      });

      if (!user) {
        return SuccessResponseHandler.success(
          'If your email is in our system, you will recive a password reset code shortly.',
        );
      }

      //generate 6-digit code
      const resetCode = this.generateResetCode();

      //hash the code before storing
      const hashedCode = await this.bcryptService.hashPassword(resetCode);

      //set expirattion time 15 mins
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      //save to datbase
      user.resetOtp = hashedCode;
      user.resetOtpExpires = expiresAt;
      await user.save();

      //Queue email with the code
      await this.mailService.sendOtp(user.email, resetCode);
      return SuccessResponseHandler.success(
        'If your email is in our system, you will recive a password reset code shortly.',
      );
    }, 'Failed to ForgetPassword');
  }

  //continue with google
  async googleSignIn(googleUser: any): Promise<any> {
    return ErrorHandler.execute(async () => {
      let user = await this.userModel.findOne({ email: googleUser.email });

      if (!user) {
        const fullName = `${googleUser.firstName} ${googleUser.lastName || ''}`.trim();
        user = await this.userModel.create({
          name: fullName || googleUser.email.split('@')[0],
          email: googleUser.email,
          password: await this.bcryptService.hashPassword(Math.random().toString(36)),
          role: 'user',
          isEmailVerified: true,
        });
      }

      const jwtPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      const access_token = await this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.getOrThrow<string>('jwtAccessSecret'),
        expiresIn: '15m',
      });

      const refresh_token = await this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.getOrThrow<string>('jwtRefreshSecret'),
        expiresIn: '7d',
      });

      return {
        success: true,
        message: 'Google login successful',
        data: {
          ...jwtPayload,
          access_token,
          refresh_token,
        },
      };
    }, 'Failed to login with Google');
  }

  //reset your password 
  async resetPassword(resetPasswordData: resetPasswordDto): Promise<any>{
    return ErrorHandler.execute(async () => {


       const user  = await this.userModel.findOne({
        email: resetPasswordData.email,
       })
       if(!user){
        throw ErrorHandler.notFound("User");
       }

       if(!user.resetOtp){
        throw ErrorHandler.invalidCredentials("No OTP request found")
       }

       const isOtpValid = await this.bcryptService.comparePassword(
        resetPasswordData.otp,
        user.resetOtp
       )

       if(!isOtpValid){
          throw ErrorHandler.invalidCredentials("Otp is not valid")
        }

        if(!user.resetOtpExpires || user.resetOtpExpires < new Date()){
          throw ErrorHandler.invalidCredentials("Otp Expired")
        }

        const hashedPassword = await this.bcryptService.hashPassword(
        resetPasswordData.newPassword
        )

        user.password = hashedPassword;
        user.resetOtp = null;
        user.resetOtpExpires = null


        await user.save();


        return SuccessResponseHandler.success('Password rest successdully, You can now login !')


    }, 'Failed to reset password')
  }
}
