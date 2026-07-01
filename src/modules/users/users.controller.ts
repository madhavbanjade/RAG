import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res, Redirect } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto, forgetPasswordDto, LoginUserDto, resetPasswordDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ProtectLoginGuard } from 'src/common/guards/auth.guards';
import { RoleProtectGuard } from 'src/common/guards/role-gaurds';
import { setAuthCookies, clearAuthCookies } from 'src/common/cookies/auth-cookie';
import  express from 'express';
import { RegisterRateLimit, LoginRateLimit, ForgotPasswordRateLimit, ResetPasswordRateLimit, VerifyEmailRateLimit } from 'src/common/decorators/rate-limit.decorator';
import { RateLimitGuard } from 'src/common/guards/rate-limit.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}



  //register your accoount to the platform 
  @Post("/register")
  @UseGuards(RateLimitGuard)
  @RegisterRateLimit()
  register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.register(createUserDto);
  }


  //verifies the email
  @Post("/verify-email")
  @UseGuards(RateLimitGuard)
  @VerifyEmailRateLimit()
  verifyEmail(@Body() body: { email: string; otp: string }) {
    return this.usersService.verifyEmail(body.email, body.otp);
  }


  //login after verified
  @Post("/login")
  @UseGuards(RateLimitGuard)
  @LoginRateLimit()
  async login(@Body() loginUserDto: LoginUserDto,
 @Req() req: express.Request,
 @Res({ passthrough: true}) res: express.Response,
) {
    const result = await this.usersService.login(loginUserDto);
    setAuthCookies(
      req,
      res,
      result.data!.access_token,
      result.data!.refresh_token,

    )
    return result
  }


  //logout the user
  @UseGuards(ProtectLoginGuard)
  
  @Post("/logout")
  logout(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const user = req['user'] as any;
    const result = this.usersService.logout(user?.id);
    clearAuthCookies(req, res);
    return result;
  }


  //oauth 
  @Get('google')
  async googleLogin(@Res() res: express.Response) {
    return res.redirect(
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      'client_id=' + process.env.GOOGLE_CLIENT_ID +
      '&redirect_uri=' + encodeURIComponent(`http://localhost:${process.env.PORT || 2000}/api/v1/users/google-callback`) +
      '&response_type=code' +
      '&scope=' + encodeURIComponent('openid email profile'),
    );
  }

  //redirect the google-callback
  @Get('google-callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: express.Response) {

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!req.user) {
      return res.redirect(`${frontendUrl}/login?error=authentication_failed`);
    }

    try {
      const result = await this.usersService.googleSignIn(req.user);
      setAuthCookies(req, res, result.data.access_token, result.data.refresh_token);
      return res.redirect(`${frontendUrl}`);
    } catch {
      return res.redirect(`${frontendUrl}/login?error=authentication_failed`);
    }
  }

  //find all the users by admin
  @UseGuards(ProtectLoginGuard, RoleProtectGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }


  //get your data 
@UseGuards(ProtectLoginGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }



  //update your data
  @UseGuards(ProtectLoginGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateUserDto) {
    return this.usersService.update(id, data);
  }


  //remove  your account from the platform 
  @UseGuards(ProtectLoginGuard, RoleProtectGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }



  //reset your password
  @UseGuards(ProtectLoginGuard, RateLimitGuard)
@ForgotPasswordRateLimit()
  @Post('forget-password')
  forgetPassword(
    @Body()
    forgetPasswordData: forgetPasswordDto

  ){
    return this.usersService.forgetPassword(
      forgetPasswordData
    )
  }



  //reset your password
  @UseGuards(ProtectLoginGuard, RateLimitGuard)
  @RegisterRateLimit()
  @Post('reset-password')
  resetPassword(
    @Body()
    restPasswordData: resetPasswordDto

  ){
    return this.usersService.resetPassword(
      restPasswordData
    )
  }

}
