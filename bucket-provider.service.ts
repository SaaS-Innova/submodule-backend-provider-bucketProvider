import { Injectable } from "@nestjs/common";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import * as fs from "fs";
import { s3bucketConfig, config } from "../../../commons/config";
import { ResponseMsgService } from "../../../commons";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { FILE_UPLOAD_TYPE } from "./constant";

@Injectable()
export class BucketProvider {
  private s3;
  /**
   * Initializes the BucketProvider with S3 configuration.
   *
   * Sets up an S3 client instance using credentials and endpoint details from
   * the configuration file, making it ready for bucket operations.
   */
  constructor(private responseMsgService: ResponseMsgService) {
    let accessKeyId;
    let secretAccessKey;
    let endpoint;
    if (config.STORAGE_TYPE === FILE_UPLOAD_TYPE.BUCKET) {
      accessKeyId = s3bucketConfig.BUCKET_ACCESS_KEY;
      secretAccessKey = s3bucketConfig.BUCKET_SECRET_KEY;
      endpoint = new URL(`${s3bucketConfig.BUCKET_ENDPOINT}`);
      this.s3 = new S3Client({
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        endpoint: endpoint.href,
        region: s3bucketConfig.BUCKET_REGION,
      });
    }
  }

  /**
   * Uploads an image to the S3 bucket.
   *
   * This function processes a file, either in base64 format or as a file object,
   * and uploads it to a specified S3 bucket. On success, it returns an object
   * containing the file URL and name; on failure, returns false.
   *
   * @param {string | { path: string }} file - The file to upload. It can be a base64 encoded string or a file object with a path.
   * @param {string} fileName - The desired name of the file in the S3 bucket.
   * @param {string} contentType - MIME type of the file.
   * @returns {Promise<Object | boolean>} The result of the upload operation containing status, imageUrl, and fileName, or false on failure.
   */
  async uploadFile(
    file: string | { path: string },
    fileName: string,
    contentType: string
  ): Promise<object | boolean> {
    const base64Reg = /^data:image\/([\w+]+);base64,([\s\S]+)/;
    const match = typeof file === "string" && file.match(base64Reg);

    let fileStream: Buffer | fs.ReadStream;
    if (!match && typeof file === "object" && file.path) {
      fileStream = fs.createReadStream(file.path);
    } else {
      let fileData = file as string;
      const fileWithoutMimeType =
        typeof file === "string" ? file.match(/,(.*)$/) : null;
      if (fileWithoutMimeType) {
        fileData = fileWithoutMimeType[1];
      }
      fileStream = Buffer.from(fileData, "base64");
    }

    // Upload the image file to GleSYS Object Storage
    const uploadParams = {
      Bucket: s3bucketConfig.BUCKET_NAME,
      Key: fileName,
      Body: fileStream,
      ContentType: contentType,
    };
    try {
      const data = await new Upload({
        client: this.s3,
        params: uploadParams,
      }).done();
      this.responseMsgService.addSuccessMsg({
        message: "File uploaded successfully.",
        type: "success",
        show: true,
      });
      this.responseMsgService.isSuccess(true);
      return { status: true, url: data.Location, fileName: fileName };
    } catch (error) {
      this.responseMsgService.addErrorMsg({
        message: error.message,
        type: "error",
        show: true,
      });
      this.responseMsgService.isSuccess(false);
      return false;
    }
  }

  /**
   * Retrieves an image from the S3 bucket.
   *
   * This function generates a presigned URL for a file in the S3 bucket,
   * allowing temporary access for downloading. If unsuccessful, returns false.
   *
   * @param {string} path - The path of the file within the bucket.
   * @param {number} [expiresIn=10] - Expiration time for the presigned URL in seconds.
   * @returns {Promise<string | false>} The presigned URL of the file, or false on failure.
   */
  async getPresignedUrlOfFile(
    path: string,
    expiresIn = 10
  ): Promise<string | false> {
    try {
      const getParams = {
        Bucket: s3bucketConfig.BUCKET_NAME,
        Key: path,
      };
      const command = new GetObjectCommand(getParams);
      const url = await getSignedUrl(this.s3, command, {
        expiresIn: expiresIn,
      });
      this.responseMsgService.isSuccess(true);
      return url;
    } catch (e) {
      this.responseMsgService.isSuccess(false);
      this.responseMsgService.addErrorMsg({
        message: `Could not retrieve file from S3: ${e.message}`,
        type: "error",
        show: true,
      });
      return false;
    }
  }

  /**
   * Deletes an image from the S3 bucket.
   *
   * This function deletes a specified file from the S3 bucket and
   * returns a boolean indicating success or failure.
   *
   * @param {string} fileName - The name of the file to delete.
   * @returns {Promise<boolean>} True on successful deletion, or false on failure.
   */
  async deleteFile(fileName: string): Promise<boolean> {
    const deleteParams = {
      Bucket: s3bucketConfig.BUCKET_NAME,
      Key: fileName,
    };
    try {
      await this.s3.send(new DeleteObjectCommand(deleteParams));
      this.responseMsgService.addSuccessMsg({
        message: "File Deleted successfully.",
        type: "success",
        show: true,
      });
      this.responseMsgService.isSuccess(true);
      return true;
    } catch (error) {
      this.responseMsgService.addErrorMsg({
        message: error.message,
        type: "error",
        show: true,
      });
      this.responseMsgService.isSuccess(false);
      return false;
    }
  }

  /**
   * Retrieves the content of a file from the S3 bucket as a base64 string.
   *
   * Fetches a file from the S3 bucket, converts its content to a base64 encoded string,
   * and returns it. If retrieval fails, returns false.
   *
   * @param {string} fileName - The name of the file to retrieve.
   * @returns {Promise<string | false>} The base64 encoded content of the file or false on failure.
   */
  async getFile(fileName: string) {
    try {
      const getParams = {
        Bucket: s3bucketConfig.BUCKET_NAME,
        Key: fileName,
      };
      const { Body } = await this.s3.send(new GetObjectCommand(getParams));
      this.responseMsgService.isSuccess(true);
      return await Body.transformToString("base64");
    } catch (e) {
      this.responseMsgService.isSuccess(false);
      this.responseMsgService.addErrorMsg({
        message: `Could not retrieve file from S3: ${e.message}`,
        type: "error",
        show: true,
      });
      return false;
    }
  }
}
