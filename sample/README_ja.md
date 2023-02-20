# Post Vision Appのセットアップとデプロイ

Post Vision AppはAI出力をアプリケーション開発に使用できるデータに処理します。</br>
このセクションでは、侵入検知に利用するPost Vision Appをビルドし、AITRIOS&trade;のConsoleからエッジAIデバイスにデプロイする方法について説明します。

## コンテンツ <!-- omit in toc -->

- [前提条件](#前提条件)
- [Post Vision Appをビルドする](#post-vision-appをビルドする)
  - [1. Dockerイメージをビルド](#1-dockerイメージをビルドする)
  - [2. .wasmファイルをコンテナから取得する](#2-wasmファイルをコンテナから取得する)
- [Post Vision AppをAITRIOSのConsoleへ登録する](#post-vision-appをaitriosのconsoleへ登録する)
- [Post Vision AppをエッジAIデバイスにデプロイする](#post-vision-appをエッジaiデバイスにデプロイする)
- [制限事項](#制限事項)

## 前提条件

Post Vision Appをビルドするために、Dockerの動作環境が必要です。

Dockerの動作環境については、[公式のドキュメント](https://matsuand.github.io/docs.docker.jp.onthefly/get-docker/)を参照してセットアップを行うか、
[開発環境セットアップガイド](https://developer.aitrios.sony-semicon.com/development-guides/get-started/setup-dev/) を参照してVisual Studio CodeとDockerを利用した開発環境のセットアップを行ってください。

## Post Vision Appをビルドする

### 1. Dockerイメージをビルドする

Post Vision Appのビルド環境となるDockerイメージを作成します。

- ターミナルで下記のコマンドを実行します

  ```bash
  cd ./sample
  docker build . -t ppl --no-cache --network host
  ```

### 2. .wasmファイルをコンテナから取得する

下記の手順で、ビルドしたPost Vision Appの.wasmファイル **`ppl_custom.wasm`** を、**`./sample/post_process/custom`** ディレクトリの下にコピーします。

- ターミナルで下記のコマンドを実行します

  ```bash
  docker create --name ppl ppl
  docker cp ppl:/root/post_process/custom/ppl_custom.wasm ./post_process/custom
  docker rm -f ppl
  ```

## Post Vision AppをAITRIOSのConsoleへ登録する

作成したPost Vision Appの.wasmファイル **`ppl_custom.wasm`** をAITRIOSのConsoleへ登録し、エッジAIデバイスにデプロイする準備を行います。</br>
下記の手順の詳細を [Consoleユーザーマニュアル](https://developer.aitrios.sony-semicon.com/file/download/console-developer-edition-ui-manual) にてご確認ください。

- Applicationの登録

## Post Vision AppをエッジAIデバイスにデプロイする

登録したPost Vision AppをエッジAIデバイスにデプロイします。</br>
下記の手順の詳細を [Consoleユーザーマニュアル](https://developer.aitrios.sony-semicon.com/file/download/console-developer-edition-ui-manual) にてご確認ください。

- Applicationデプロイ

## 制限事項

- なし
