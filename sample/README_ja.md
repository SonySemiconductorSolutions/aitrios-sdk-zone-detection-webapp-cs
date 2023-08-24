# 「**Vision and Sensing Application**」のセットアップとデプロイ

「**Vision and Sensing Application**」はAI出力をアプリケーション開発に使用できるデータに処理します。</br>
このセクションでは、侵入検知に利用する「**Vision and Sensing Application**」をビルドし、AITRIOS&trade;の「**Console**」からエッジAIデバイスにデプロイする方法について説明します。

## コンテンツ <!-- omit in toc -->

- [前提条件](#前提条件)
- [「**Vision and Sensing Application**」をビルドする](#Vision-and-Sensing-Applicationをビルドする)
  - [1. Dockerイメージをビルドする](#1-dockerイメージをビルドする)
  - [2. .wasmファイルをコンテナから取得する](#2-wasmファイルをコンテナから取得する)
- [「**Vision and Sensing Application**」をAITRIOSの「**Console**」へ登録する](#Vision-and-Sensing-Applicationをaitriosのconsoleへ登録する)
- [「**Vision and Sensing Application**」をエッジAIデバイスにデプロイする](#Vision-and-Sensing-Applicationをエッジaiデバイスにデプロイする)
- [制限事項](#制限事項)

## 前提条件

「**Vision and Sensing Application**」をビルドするために、Dockerの動作環境が必要です。

Dockerの動作環境については、[公式のドキュメント](https://matsuand.github.io/docs.docker.jp.onthefly/get-docker/)を参照してセットアップを行うか、
[「**開発環境セットアップガイド**」](https://developer.aitrios.sony-semicon.com/downloads#sdk-getting-started) を参照してVisual Studio CodeとDockerを利用した開発環境のセットアップを行ってください。

## 「**Vision and Sensing Application**」をビルドする

### 1. Dockerイメージをビルドする

「**Vision and Sensing Application**」のビルド環境となるDockerイメージを作成します。

- ターミナルで下記のコマンドを実行します

  ```bash
  docker build . -t vns_app --no-cache --network host
  ```

### 2. .wasmファイルをコンテナから取得する

下記の手順で、ビルドした「**Vision and Sensing Application**」の.wasmファイル **`vision_app_zonedetection.wasm`** を、**`./`** ディレクトリの下にコピーします。

- ターミナルで下記のコマンドを実行します

  ```bash
  docker create --name vns_app vns_app
  docker cp vns_app:/root/sample/vision_app/single_dnn/zonedetection/vision_app_zonedetection.wasm .
  docker rm -f vns_app
  ```

## 「**Vision and Sensing Application**」をAITRIOSの「**Console**」へ登録する

作成した「**Vision and Sensing Application**」の.wasmファイル **`vision_app_zonedetection.wasm`** をAITRIOSの「**Console**」へ登録し、エッジAIデバイスにデプロイする準備を行います。</br>
下記の手順の詳細を [「**Consoleユーザーマニュアル**」](https://developer.aitrios.sony-semicon.com/documents/console-user-manual) にてご確認ください。

- Applicationの登録

## 「**Vision and Sensing Application**」をエッジAIデバイスにデプロイする

登録した「**Vision and Sensing Application**」をエッジAIデバイスにデプロイします。</br>
下記の手順の詳細を [「**Consoleユーザーマニュアル**」](https://developer.aitrios.sony-semicon.com/documents/console-user-manual) にてご確認ください。

- Applicationデプロイ

## 制限事項

- なし
