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
    const accessKeyId = s3bucketConfig.BUCKET_ACCESS_KEY;
    const secretAccessKey = s3bucketConfig.BUCKET_SECRET_KEY;
    const endpoint = new AWS.Endpoint(`${s3bucketConfig.BUCKET_ENDPOINT}`);
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
  async uploadFile(file, fileName) {
    const base64Reg = /^data:image\/([\w+]+);base64,([\s\S]+)/;
    const match = file.match(base64Reg);

    let fileStream;
    if (!match && typeof file === 'object' && file.path) {
      fileStream = fs.createReadStream(file.path);
    } else {
      let fileData = file;
      const fileWithoutMimeType = file.match(/,(.*)$/);
      if (fileWithoutMimeType) {
        fileData = fileWithoutMimeType[1];
      }
      fileStream = Buffer.from(fileData, 'base64');
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
  async getFile(fileName) {
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
      this.responseMsgService.addErrorMsg({
        message: `Could not retrieve file from S3: ${e.message}`,
        type: 'error',
        show: true,
      });
      return false;
    }
  }

  /**
   * Deletes an image from the S3 bucket.
   * @param {string} fileName - The name of the file to delete.
   * @returns {Promise<boolean>} True on successful deletion, or false on failure.
   */
  async deleteFile(fileName) {
    const deleteParams = {
      Bucket: s3bucketConfig.BUCKET_NAME,
      Key: fileName,
    };
    try {
      await this.s3.deleteObject(deleteParams).promise();
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
