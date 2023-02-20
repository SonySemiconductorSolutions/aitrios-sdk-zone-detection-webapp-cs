# aitrios-sdk-zone-detection-webapp-cs

## このソフトウェアについて

Vision and Sensing Application SDK と Cloud SDK のサンプルです。ご利用にあたっては、下記の点に注意してください。

- 本サンプルは、開発での使用を前提として公開しております。
- このサンプルには、デバイスの正常な動作を妨げるエラーまたは欠陥が含まれている可能性があります。

## コンテンツ <!-- omit in toc -->

- [概要](#概要)
- [前提条件](#前提条件)
- [セットアップガイド](#セットアップガイド)
  - [デバイスのセットアップ](#1-デバイスのセットアップ)
  - [AIモデルのセットアップとデプロイ](#2-aiモデルのセットアップとデプロイ)
  - [Post Vision Appのセットアップとデプロイ](#3-post-vision-appのセットアップとデプロイ)
  - [Azureリソースのデプロイ](#4-azureリソースのデプロイ)
- [チュートリアル](#チュートリアル)
- [制限事項](#制限事項)
- [サポート](#サポート)
- [商標](#商標)

## 概要

このソフトウェアは、AITRIOS&trade;のプラットフォームを利用して侵入検知システムを容易に構築する環境を提供します。

## 前提条件

このソフトウェアの実行には、下記のサービスおよびエッジAIデバイスが必要です。

- デベロッパーエディションBasicプランのご購入
- エッジAIデバイスのご購入
- Azureアカウントおよび、サブスクリプションのご購入

## セットアップガイド

このソフトウェアを利用するためのセットアップ手順について説明します。

### 1. デバイスのセットアップ

ご購入頂いたエッジAIデバイスの設定を行って下さい。

下記の手順の詳細を [デバイス設定ガイド](https://developer.aitrios.sony-semicon.com/file/download/device-setup) にてご確認ください。

- デバイス証明書の取得
- エッジAIデバイスの登録
- ConsoleとエッジAIデバイスの接続
- エッジAIデバイスのファームウェア更新
- エッジAIデバイスの設置確認

### 2. AIモデルのセットアップとデプロイ

侵入検知に利用するAIモデルを設定し、エッジAIデバイスにデプロイします。

下記の手順の詳細を [Consoleユーザーマニュアル](https://developer.aitrios.sony-semicon.com/file/download/console-developer-edition-ui-manual) にてご確認ください。

- Create model
- Train model

トレーニングに使用する画像は、下記のZIPファイルをダウンロードしてご利用いただけます。

- [training_images.zip](./sample/training_images.zip)

### 3. Post Vision Appのセットアップとデプロイ

侵入検知に利用するPost Vision Appをビルドし、エッジAIデバイスにデプロイします。

手順の詳細を [README](./sample/README_ja.md) にてご確認ください。

### 4. Azureリソースのデプロイ

Azure PortalとARMテンプレートを使用して、Azureリソースをデプロイします。</br>
Consoleとの接続設定やアプリケーションの設定なども同時に行うことができます。

手順の詳細を [README](./deploy/README_ja.md) にてご確認ください。

## チュートリアル

次のチュートリアルを使用して、AzureにデプロイされたZoneDetectionの利用方法を確認いただけます。

アプリケーションの概要および、操作手順の詳細を [README](./ZoneDetection/README_ja.md) にてご確認ください。

## 制限事項

- なし

## サポート

- [Contact us](https://developer.aitrios.sony-semicon.com/contact-us/)

## 商標

- [Read This First](https://developer.aitrios.sony-semicon.com/development-guides/documents/manuals/)
