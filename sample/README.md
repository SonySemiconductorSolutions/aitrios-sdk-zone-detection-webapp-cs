# Set up and deploy "**Edge Application**"

"**Edge Application**" processes the AI output into data that can be used for application development.</br>
This section describes how to build a "**Edge Application**" for zone detection and deploy it from "**Console for AITRIOS&trade;**" to Edge Device.

## Content <!-- omit in toc -->

- [Prerequisite](#prerequisite)
- [Build "**Edge Application**"](#build-edge-application)
  - [1. Build Docker Image](#1-build-docker-image)
  - [2. Get .wasm file from container](#2-get-wasm-file-from-container)
- [Register "**Edge Application**" in "**Console for AITRIOS**"](#register-edge-application-in-console-for-aitrios)
- [Deploy "**Edge Application**" to Edge Device](#deploy-edge-application-to-edge-ai-device)
- [Restrictions](#restrictions)

## Prerequisite

To build the "**Edge Application**", you need an environment that runs Docker.

See the [official documentation](https://docs.docker.com/get-docker/) to set up an environment that runs Docker, or 
see the ["**SDK Getting Started**"](https://developer.aitrios.sony-semicon.com/en/edge-ai-sensing/downloads#sdk-getting-started) to set up a development environment using Visual Studio Code and Docker.

## Build "**Edge Application**"

### 1. Build Docker Image

Create a Docker image that will be the build environment for your "**Edge Application**".

- Run the following command in terminal

  ```bash
  docker build . -t vns_app --no-cache --network host
  ```

### 2. Get .wasm file from container

Follow the procedures to copy the "**Edge Application**" .wasm file you built, **`vision_app_zonedetection.wasm`**, to the **`./`** directory.

- Run the following command in terminal

  ```bash
  docker create --name vns_app vns_app
  docker cp vns_app:/root/sample/vision_app/single_dnn/zonedetection/vision_app_zonedetection.wasm .
  docker rm -f vns_app
  ```

## Register "**Edge Application**" in "**Console for AITRIOS**"

Register the "**Edge Application**" .wasm file you created, **`vision_app_zonedetection.wasm`**, in the "**Console for AITRIOS**" and prepare it for deployment to Edge Device.</br> 
See the ["**Console User Manual**"](https://developer.aitrios.sony-semicon.com/en/edge-ai-sensing/documents/console-user-manual/).

- Registering an Application

## Deploy "**Edge Application**" to Edge Device

Deploy the "**Edge Application**" you registered to an Edge Device.</br>
See the ["**Console User Manual**"](https://developer.aitrios.sony-semicon.com/en/edge-ai-sensing/documents/console-user-manual/).

- Deploying an Application

## Restrictions

- None
