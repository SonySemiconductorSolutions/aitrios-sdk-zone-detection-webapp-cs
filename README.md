# aitrios-sdk-zone-detection-webapp-cs

## About this Software

This is a sample of Vision and Sensing Application SDK and Cloud SDK. Please note the following when using it：

- This sample is released with the assumption it will be used for development.
- This sample may contain errors or defects that obstruct regular operation of the device.

## Content <!-- omit in toc -->

- [Overview](#overview)
- [Prerequisite](#prerequisite)
- [Setup Guide](#setup-guide)
  - [1. Set up your device](#1-set-up-your-device)
  - [2. Set up and deploy AI model](#2-set-up-and-deploy-ai-model)
  - [3. Set up and deploy Post Vision App](#3-set-up-and-deploy-post-vision-app)
  - [4. Deploy Azure resources](#4-deploy-azure-resources)
- [Tutorials](#tutorials)
- [Restrictions](#restrictions)
- [Get support](#get-support)
- [Trademark](#trademark)

## Overview

This software provides an environment to build a zone detection system using the AITRIOS&trade; platform.

## Prerequisite

The following service and edge AI device are required to run this software:

- Buy Developer Edition Basic Plan
- Buy edge AI device
- Buy Azure account and subscription

## Setup Guide

Here are the setup procedures for using this software.

### 1. Set up your device

Configure the edge AI device you purchased.

See the "[Device Setup Guide](https://developer.aitrios.sony-semicon.com/file/download/device-setup)" for details on the following procedures.

- Obtaining device certificates 
- Register the edge AI device 
- Connecting the edge AI device to Console 
- Updating the edge AI device firmware 
- Installing the edge AI device

### 2. Set up and deploy AI model

Set up an AI model to use for zone detection and deploy it to edge AI
device.

See the "[Console User Manual](https://developer.aitrios.sony-semicon.com/file/download/console-developer-edition-ui-manual)" for details on the following procedures.

- Create model 
- Train model

The images for training are available by downloading the following ZIP file.

- [training_images.zip](./sample/training_images.zip)

### 3. Set up and deploy Post Vision App

Build a Post Vision App for zone detection and deploy it to edge AI device.

See the "[README](./sample/README.md)" for details on procedures.

### 4. Deploy Azure resources

Use the Azure Portal and an ARM template to deploy your Azure resources. </br> 
You can also set up a connection with the Console and configure applications at the same time.

See the "[README](./deploy/README.md)" for details on procedures.

## Tutorials

Use the following tutorial to learn how to use ZoneDetection deployed to Azure.

See the "[README](./ZoneDetection/README.md)" for an overview of the application and detailed procedures on how to operate it.

## Restrictions

- None

## Get support

- [Contact us](https://developer.aitrios.sony-semicon.com/contact-us/)

## Trademark

- [Read This First](https://developer.aitrios.sony-semicon.com/development-guides/documents/manuals/)
