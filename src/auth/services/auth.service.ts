import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable, from, throwError } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  generateJWT(credential: Credential): Observable<string> {
    return from(this.jwtService.signAsync({ credential }));
  }

  encrypt(text) {
    const iv = randomBytes(16);
    const { algorithm, cipherKey } = this.configService.get('crypto');
    const cipher = createCipheriv(algorithm, Buffer.from(cipherKey), iv);
    let encrypted = cipher.update(text, 'utf8');

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const { algorithm, cipherKey } = this.configService.get('crypto');
    const decipher = createDecipheriv(algorithm, Buffer.from(cipherKey), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  }

  compareSaltAndHashed(password, hash): Observable<any> {
    return from(!password || !hash ? null : bcrypt.compare(password, hash));
  }

  saltAndHash(password: string): Observable<any> {
    if (
      password === undefined ||
      password === '' ||
      !password ||
      typeof password !== 'string'
    ) {
      return throwError('invalid arguments');
    }

    return from(
      bcrypt
        .genSalt(this.configService.get('crypto.saltRounds'))
        .then((salt) => bcrypt.hash(password, salt)),
    );
  }
}
