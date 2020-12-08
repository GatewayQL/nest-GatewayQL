import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../models/user.entity';
import { User } from '../models/user.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(user: User): Promise<User> {
    const newUser = new UserEntity();
    newUser.firstname = user.firstname;
    newUser.lastname = user.lastname;
    if (
      user.username === undefined ||
      user.username === '' ||
      user.username === null
    ) {
      newUser.username = user.email;
    } else {
      newUser.username = user.username;
    }
    newUser.email = user.email;
    newUser.redirectUri = user.redirectUri;
    newUser.role = user.role;

    const createdUser = await this.userRepository.create(newUser);

    try {
      return await this.userRepository.save(createdUser);
    } catch (e) {
      throw new BadRequestException(
        'Cannot create user into database. error: ' + e,
      );
    }
  }

  async findOne(id: string): Promise<User> {
    return await this.userRepository.findOne({ id });
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async deleteOne(id: string): Promise<any> {
    return await this.userRepository.delete(id);
  }

  async updateOne(id: string, user: User): Promise<any> {
    delete user.email;
    delete user.role;

    return await this.userRepository.update(id, user);
  }

  async findByemail(email: string): Promise<User> {
    return await this.userRepository.findOne({ email });
  }

  async findByUsername(username: string): Promise<User> {
    return await this.userRepository.findOne({ username });
  }
}
