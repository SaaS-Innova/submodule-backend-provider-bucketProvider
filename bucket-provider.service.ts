import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import { ResponseMsgService } from '../../commons';
import { s3bucketConfig } from '../../commons/config';

@Injectable()
export class BucketProvider {
  private s3;
  constructor(private responseMsgService: ResponseMsgService) {
    const accessKeyId = s3bucketConfig.ACCESS_KEY;
    const secretAccessKey = s3bucketConfig.SECRET_KEY;
    const endpoint = new AWS.Endpoint(`${s3bucketConfig.ENDPOINT}`);
    this.s3 = new AWS.S3({
      endpoint,
      accessKeyId,
      secretAccessKey,
    });
  }
  async uploadImage(file, fileName) {
    const reg = /^data:image\/([\w+]+);base64,([\s\S]+)/;
    const match = file.match(reg);

    let fileStream;
    if (!match && typeof file === 'object' && file.path) {
      fileStream = fs.createReadStream(file.path);
    } else {
      fileStream = Buffer.from(file, 'base64');
    }

    // Upload the image file to GleSYS Object Storage
    const uploadParams = {
      Bucket: s3bucketConfig.BUCKET_NAME,
      Key: fileName,
      Body: fileStream,
      ACL: 'public-read',
    };
    try {
      const data = await this.s3.upload(uploadParams).promise();
      this.responseMsgService.addSuccessMsg({
        message: 'File uploaded successfully.',
        type: 'success',
        show: true,
      });
      this.responseMsgService.isSuccess(true);
      return { status: true, imageUrl: data.Location, fileName: fileName };
    } catch (error) {
      this.responseMsgService.addErrorMsg({
        message: error.message,
        type: 'error',
        show: true,
      });
      this.responseMsgService.isSuccess(false);
      return false;
    }
  }

  async getImage(fileName) {
    try {
      const getParams = {
        Bucket: s3bucketConfig.BUCKET_NAME,
        Key: fileName,
      };
      const data = await this.s3.getObject(getParams).promise();
      this.responseMsgService.isSuccess(true);
      return data;
    } catch (e) {
      this.responseMsgService.isSuccess(false);
      return {
        status: false,
        error: `Could not retrieve file from S3: ${e.message}`,
      };
    }
  }

  async deleteImage(fileName) {
    const deleteParams = {
      Bucket: s3bucketConfig.BUCKET_NAME,
      Key: fileName,
    };
    try {
      const data = await this.s3.deleteObject(deleteParams).promise();
      this.responseMsgService.addSuccessMsg({
        message: 'File Deleted successfully.',
        type: 'success',
        show: true,
      });
      this.responseMsgService.isSuccess(true);
      return true;
    } catch (error) {
      this.responseMsgService.addErrorMsg({
        message: error.message,
        type: 'error',
        show: true,
      });
      this.responseMsgService.isSuccess(false);
      return false;
    }
  }
}
