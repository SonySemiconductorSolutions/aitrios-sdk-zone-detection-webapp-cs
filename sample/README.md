# Set up and deploy "**Vision and Sensing Application**"

"**Vision and Sensing Application**" processes the AI output into data that can be used for application development.</br>
This section describes how to build a "**Vision and Sensing Application**" for zone detection and deploy it from "**Console for AITRIOS&trade;**" to edge AI device.

## Content <!-- omit in toc -->

- [Prerequisite](#prerequisite)
- [Build "**Vision and Sensing Application**"](#build-vision-and-sensing-application)
  - [1. Build Docker Image](#1-build-docker-image)
  - [2. Get .wasm file from container](#2-get-wasm-file-from-container)
- [Register "**Vision and Sensing Application**" in "**Console for AITRIOS**"](#register-vision-and-sensing-application-in-console-for-aitrios)
- [Deploy "**Vision and Sensing Application**" to edge AI device](#deploy-vision-and-sensing-application-to-edge-ai-device)
- [Restrictions](#restrictions)

## Prerequisite

To build the "**Vision and Sensing Application**", you need an environment that runs Docker.

See the [official documentation](https://docs.docker.com/get-docker/) to set up an environment that runs Docker, or 
see the ["**SDK Getting Started**"](https://developer.aitrios.sony-semicon.com/en/file/download/sdk-getting-started/) to set up a development environment using Visual Studio Code and Docker.

## Build "**Vision and Sensing Application**"

### 1. Build Docker Image

Create a Docker image that will be the build environment for your "**Vision and Sensing Application**".

- Run the following command in terminal

  ```bash
  docker build . -t vns_app --no-cache --network host
  ```

### 2. Get .wasm file from container

Follow the procedures to copy the "**Vision and Sensing Application**" .wasm file you built, **`vision_app_zonedetection.wasm`**, to the **`./`** directory.

- Run the following command in terminal

  ```bash
  docker create --name vns_app vns_app
  docker cp vns_app:/root/sample/vision_app/single_dnn/zonedetection/vision_app_zonedetection.wasm .
  docker rm -f vns_app
  ```

## Register "**Vision and Sensing Application**" in "**Console for AITRIOS**"

Register the "**Vision and Sensing Application**" .wasm file you created, **`vision_app_zonedetection.wasm`**, in the "**Console for AITRIOS**" and prepare it for deployment to edge AI device.</br> 
See the ["**Console User Manual**"](https://developer.aitrios.sony-semicon.com/en/documents/console-user-manual).

- Registering an Application

## Deploy "**Vision and Sensing Application**" to edge AI device

Deploy the "**Vision and Sensing Application**" you registered to an edge AI device.</br>
See the ["**Console User Manual**"](https://developer.aitrios.sony-semicon.com/en/documents/console-user-manual).

- Deploying an Application

## Restrictions

- None
