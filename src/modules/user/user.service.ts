import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindManyOptions,
  FindOptionsWhere,
  Like,
  Not,
  Repository,
} from 'typeorm';
import bcrypt from 'bcrypt';
import { UpdateUserInfoDto, UserLoginDto } from './user.dto';
import { UserEntity } from '@/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  findOne(where: FindOptionsWhere<UserEntity>): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where });
  }

  find(where: FindManyOptions<UserEntity>): Promise<UserEntity[] | null> {
    return this.userRepository.find(where);
  }

  findAndCount(
    options: FindManyOptions<UserEntity>,
  ): Promise<[Array<UserEntity>, number]> {
    return this.userRepository.findAndCount(options);
  }

  async getByCredentials(
    username: string,
    password: string,
  ): Promise<UserEntity | null> {
    // return this.userRepository.findOne({
    //   where: {
    //     username,
    //     password: await this.createPasswordHash(password),
    //   },
    // });
    return this.getOrCreateUser({ username, password });
  }

  async getOrCreateUser(userDto: UserLoginDto): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: {
        username: userDto.username,
      },
    });
    if (user) {
      return user;
    } else {
      return this.userRepository.save({
        ...userDto,
        password: await this.createPasswordHash(userDto.password),
      });
    }
  }

  private createPasswordHash(password: string): string {
    return bcrypt.hash(password, 10);
  }

  async searchUsers(username: string) {
    const [result] = await this.userRepository.findAndCount({
      where: { username: Like(`%${username}%`) },
    });
    return result;
  }

  async updateUserProfile(
    userId,
    userInfoDto: UpdateUserInfoDto,
  ): Promise<UserEntity> {
    const isConflict = await this.userRepository.findOne({
      where: { username: userInfoDto.username, id: Not(userId) },
    });
    if (isConflict) {
      throw new ConflictException('用户名已存在');
    }
    await this.userRepository.update(userId, userInfoDto);
    return this.userRepository.findOneBy({ id: userId });
  }
}
