# A Basic Object Store for use with FlowForge

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