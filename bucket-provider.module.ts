import { Module } from '@nestjs/common';
import { ResponseMsgService } from 'src/commons';
import { BucketProvider } from './bucket-provider.service';

@Module({
  imports: [],
  providers: [BucketProvider, ResponseMsgService],
  exports: [BucketProvider],
})
export class BucketProviderModule {}

