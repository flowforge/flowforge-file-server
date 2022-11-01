# A Basic Object Store for use with FlowForge

## End Points

- Create/Replace

    **POST** */v1/files/:teamId/:projectId/[path and filename]*
- Append

    **POST** */v1/files/:teamId/:projectId/[path and filename]*

    With Header `FF_MODE: append`
- Read File

    **GET** */v1/files/:teamId/:projectId/[path and filename]*
- Delete File

    **DELETE** /v1/files/:teamId/:projectId/[path and filename]()

- Check team quota usage

    **GET** */v1/quota/:teamId*