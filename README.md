# A Basic Object Store for use with FlowForge

## Authorisation

All requests should include a `Authorization` header with a Bearer token assigned by the FlowForge platform to identify
## End Points

- Create/Replace

    **POST** */v1/files/:teamId/:projectId/[path and filename]*

    Content-Type: application/octet-stream

- Append

    **POST** */v1/files/:teamId/:projectId/[path and filename]*

    With Header `FF_MODE: append`

    Content-Type: application/octet-stream
- Read File

    **GET** */v1/files/:teamId/:projectId/[path and filename]*

    Content-Type: application/octet-stream

- Delete File

    **DELETE** */v1/files/:teamId/:projectId/[path and filename]*

- Check team quota usage

    **GET** */v1/quota/:teamId*

    Content-Type: application/json

## Configuration

Configuration is read from `etc/flowforge.yml`

```
host: 0.0.0.0
port: 3001
driver:
  type: localfs
  options:
    root: var/root
```

- driver
    - type - can be `s3`, `localfs` or `memory` (for testing)
    - options - will vary by driver

### S3

The following can be any of the options for the S3Client Contructor, see [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html)

- options
    - bucket - name of S3 Bucket (required)
    - region - AWS Region
    - endpoint - S3 ObjectStore Endpoint (if not using AWS S3)
    - forcePathStyle: true/false
    - credential
        - accessKeyId - AccountID/Username
        - secretAccessKey - SecretKey/Password
### LocalFS
- options
    - root - path to store team files, relative path will apply to FLOWFORGE_HOME
### Memory

### Environment variables

- FLOWFORGE_HOME default `/opt/flowforge-file-storage`
- PORT overrides value in config file, default 3001