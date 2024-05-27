import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import { s3bucketConfig } from '../../../commons/config';
import { ResponseMsgService } from '../../../commons';

@Injectable()
export class BucketProvider {
  private s3;
  /**
   * Initializes the BucketProvider with AWS S3 configuration.
  */
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

  /**
   * Uploads an image to the S3 bucket.
   * @param {string | object} file - The file to upload. It can be a base64 encoded string or a file object with a path.
   * @param {string} fileName - The desired name of the file in the S3 bucket.
   * @returns {Promise<Object>} The result of the upload operation containing status, imageUrl, and fileName, or false on failure.
  */
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

  /**
   * Retrieves an image from the S3 bucket.
   * @param {string} fileName - The name of the file to retrieve.
   * @returns {Promise<Object>} The retrieved object data from S3 or an error message on failure.
   */
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

  /**
   * Deletes an image from the S3 bucket.
   * @param {string} fileName - The name of the file to delete.
   * @returns {Promise<boolean>} True on successful deletion, or false on failure.
   */
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
