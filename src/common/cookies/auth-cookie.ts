import { CookieOptions, Request, Response } from 'express';

export const getBaseCookieOptions = (req: Request): CookieOptions => {
  const isSecure =
    req.secure || req.get('x-forwarded-proto') === 'https';

  return {
    httpOnly: true,
    secure: true, // false on localhost http
    // sameSite: "lax" is blocking cookies in your frontend GET request
    sameSite: 'none',  //works only for https
    path: '/',
  };
};

export const getAccessTokenCookieOptions = (
  req: Request,
): CookieOptions => ({
  ...getBaseCookieOptions(req),
  maxAge: 15 * 60 * 1000, // 15 minutes
});

export const getRefreshTokenCookieOptions = (
  req: Request,
): CookieOptions => ({
  ...getBaseCookieOptions(req),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

export const setAuthCookies = (
  req: Request,
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  res.cookie(
    'access_token',
    accessToken,
    getAccessTokenCookieOptions(req),
  );

  res.cookie(
    'refresh_token',
    refreshToken,
    getRefreshTokenCookieOptions(req),
  );
};

export const clearAuthCookies = (req: Request, res: Response) => {
  const baseOptions = getBaseCookieOptions(req);

  res.clearCookie('access_token', baseOptions);
  res.clearCookie('refresh_token', baseOptions);
};