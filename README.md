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

## Configuration

Configuration is read from `etc/flowforge.yml`

```
host: 0.0.0.0
port: 3001
driver:
  type: localfs
  root: var/root
```

- driver
    - type - can be `localfs` or `memory` (for testing)
    - root - path to store team files, relative path will apply to FLOWFORGE_HOME

### Environment variables

- FLOWFORGE_HOME default `/opt/flowforge-file-storage`
- PORT overides value in config file, default 3001