# Set up and deploy Post Vision App

Post Vision App processes the AI output into data that can be used for application development.</br>
This section describes how to build a Post Vision App for zone detection and deploy it from "Console for AITRIOS", hereafter referred to as Console, to edge AI device.

## Content <!-- omit in toc -->

- [Prerequisite](#prerequisite)
- [Build Post Vision App](#build-post-vision-app)
  - [1. Build Docker Image](#1-build-docker-image)
  - [2. Get .wasm file from container](#2-get-wasm-file-from-container)
- [Register Post Vision App in Console](#register-post-vision-app-in-console)
- [Deploy Post Vision App to edge AI device](#deploy-post-vision-app-to-edge-ai-device)
- [Restrictions](#restrictions)

## Prerequisite

To build the Post Vision App, you need an environment that runs Docker.

See the [official documentation](https://matsuand.github.io/docs.docker.jp.onthefly/get-docker/) to set up an environment that runs Docker, or 
see the "[SDK Getting Started](https://developer.aitrios.sony-semicon.com/development-guides/get-started/setup-dev/)" to set up a development environment using Visual Studio Code and Docker.

## Build Post Vision App

### 1. Build Docker Image

Create a Docker image that will be the build environment for your Post
Vision App.

- Run the following command in terminal

  ```bash
  cd ./sample
  docker build . -t ppl --no-cache --network host
  ```

### 2. Get .wasm file from container

Follow the procedures to copy the Post Vision App .wasm file you built, **`ppl_custom.wasm`**, to the **`./sample/post_process/custom`** directory.

- Run the following command in terminal

  ```bash
  docker create --name ppl ppl
  docker cp ppl:/root/post_process/custom/ppl_custom.wasm ./post_process/custom
  docker rm -f ppl
  ```

## Register Post Vision App in Console

Register the Post Vision App .wasm file you created, **`ppl_custom.wasm`**, in the Console and prepare it for deployment to edge AI device.</br> 
See the "[Console User Manual](https://developer.aitrios.sony-semicon.com/file/download/console-developer-edition-ui-manual)".

- Registering an Application

## Deploy Post Vision App to edge AI device

Deploy the Post Vision App you registered to an edge AI device.</br> 
See the "[Console User Manual](https://developer.aitrios.sony-semicon.com/file/download/console-developer-edition-ui-manual)".

- Deploying an Application

## Restrictions

- None
