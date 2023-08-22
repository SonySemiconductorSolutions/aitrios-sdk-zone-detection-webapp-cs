# aitrios-sdk-zone-detection-webapp-cs

## このソフトウェアについて

「**Vision and Sensing Application SDK**」 と 「**Cloud SDK**」 のサンプルです。ご利用にあたっては、下記の点に注意してください。

- 本サンプルは、開発での使用を前提として公開しております。
- このサンプルには、デバイスの正常な動作を妨げるエラーまたは欠陥が含まれている可能性があります。

## コンテンツ <!-- omit in toc -->

- [概要](#概要)
- [前提条件](#前提条件)
- [セットアップガイド](#セットアップガイド)
  - [1. デバイスのセットアップ](#1-デバイスのセットアップ)
  - [2. AIモデルのセットアップとデプロイ](#2-aiモデルのセットアップとデプロイ)
  - [3. 「**Vision and Sensing Application**」のセットアップとデプロイ](#3-Vision-and-Sensing-Applicationのセットアップとデプロイ)
  - [4. Azureリソースのデプロイ](#4-azureリソースのデプロイ)
- [チュートリアル](#チュートリアル)
- [制限事項](#制限事項)
- [サポート](#サポート)
- [参照](#参照)
- [商標](#商標)
- [ブランチ](#ブランチ)
- [バージョニング](#バージョニング)

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

下記の手順の詳細を [「**デバイス設定ガイド**」](https://developer.aitrios.sony-semicon.com/documents/device-setup-guide) にてご確認ください。

- デバイス証明書の取得
- エッジAIデバイスの登録
- ConsoleとエッジAIデバイスの接続
- エッジAIデバイスのファームウェア更新
- エッジAIデバイスの設置確認

### 2. AIモデルのセットアップとデプロイ

侵入検知に利用するAIモデルを設定し、エッジAIデバイスにデプロイします。

下記の手順の詳細を [「**Consoleユーザーマニュアル**」](https://developer.aitrios.sony-semicon.com/documents/console-user-manual) にてご確認ください。

- Create model
- Train model

トレーニングに使用する画像は、下記のZIPファイルをダウンロードしてご利用いただけます。

- [training_images.zip](./sample/training_images.zip)

### 3. 「**Vision and Sensing Application**」のセットアップとデプロイ

侵入検知に利用する「**Vision and Sensing Application**」をビルドし、エッジAIデバイスにデプロイします。

手順の詳細を [「**README**」](./sample/README_ja.md) にてご確認ください。

### 4. Azureリソースのデプロイ

Azure PortalとARMテンプレートを使用して、Azureリソースをデプロイします。</br>
「**Console**」との接続設定やアプリケーションの設定なども同時に行うことができます。

手順の詳細を [「**README**」](./deploy/README_ja.md) にてご確認ください。

## チュートリアル

次のチュートリアルを使用して、Azureにデプロイされた「**ZoneDetection**」の利用方法を確認いただけます。

アプリケーションの概要および、操作手順の詳細を [「**README**」](./ZoneDetection/README_ja.md) にてご確認ください。

## 制限事項

- なし

## サポート

- [Contact us](https://developer.aitrios.sony-semicon.com/contact-us/)

## 参照

- ["**Developer Site**"](https://developer.aitrios.sony-semicon.com/en)

## 商標

- [「**Read This First**」](https://developer.aitrios.sony-semicon.com/documents/read-this-first)

## バージョニング

このリポジトリはSemantic Versioning 2.0.0に準拠しています。

## ブランチ

このリポジトリのReleaseについては[**Releases**]から"**Release Note**"を参照してください。

各リリースはmainブランチに生成されます。プレリリースはdevelopブランチに生成されます。リリースは他のブランチからは提供されません。

## セキュリティ

CodeSpacesのご利用の前に、Githubのサイトポリシーをお読みいただき、利用条件をご理解の上でご利用ください。
