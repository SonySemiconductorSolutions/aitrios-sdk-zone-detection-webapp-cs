# ZoneDetection デプロイ手順書

## コンテンツ

- [概要](#概要)
- [前提条件](#前提条件)
- [事前準備](#事前準備)
  - [1. 必要なソフトウェアをインストールする](#1-必要なソフトウェアをインストールする)
  - [2. VS Codeの拡張機能をインストールする](#2-vs-codeの拡張機能をインストールする)
  - [3.リポジトリをCloneする](#3-リポジトリをcloneする)
- [環境構築方法](#環境構築方法)
  - [1. アプリケーションを登録する](#1-アプリケーションを登録する)
  - [2. テンプレートを利用したカスタムデプロイを実行する](#2-テンプレートを利用したカスタムデプロイを実行する)
  - [3. WebAppの認証を追加する](#3-webappの認証を追加する)
- [デプロイ方法](#デプロイ方法)
  - [1. WebAppをデプロイする](#1-webappをデプロイする)
  - [2. Functionsをデプロイする](#2-functionsをデプロイする)
- [Consoleに外部転送の設定をする](#consoleに外部転送の設定をする)
  - [1. トークン情報を取得する](#1-トークン情報を取得する)
  - [2. event Hubsの情報を取得する](#2-event-hubsの情報を取得する)
  - [3. UpdateIRHubConnector APIを実行する](#3-updateirhubconnector-apiを実行する)
  - [4. ストレージアカウントの情報を取得する](#4-ストレージアカウントの情報を取得する)
  - [5. UpdateStorageConnector APIを実行する](#5-updatestorageconnector-apiを実行する)
- [制限事項](#制限事項)

## 概要

この手順書では、環境構築方法および、リソースのデプロイ方法を提供します。

## 前提条件

このデプロイ手順書を進めるには、下記のサービスおよび、各情報が必要になります。事前にご確認ください。

- Azureアカウントおよび、リソースグループの作成</br>
  デプロイ時に利用する情報をAzure Portalから取得してください。必要な情報は下記の通りです。
  - サブスクリプション名
  - リソースグループ名
- Consoleへアクセスするための接続情報</br>
  デプロイ時に利用する情報をConsoleから取得してください。必要な情報は下記の通りです。
  - クライアントID
  - シークレット
- Gitアカウントの作成および、「SonySemiconductorSolutions」へのアクセス権限

## 事前準備

### 1. 必要なソフトウェアをインストールする

お使いのPC上に下記のソフトウェアをインストールしてください。

- Visual Studio Code(以下、VS Code)のインストール</br>
  お使いの環境向けのインストーラを [公式サイト](https://azure.microsoft.com/ja-jp/products/visual-studio-code/) からインストールしてください。

- .NET6.0のインストール</br>
  お使いの環境向けのインストーラを [公式サイト](https://dotnet.microsoft.com/en-us/download/dotnet/6.0) からインストールしてください。

### 2. VS Codeの拡張機能をインストールする

お使いのPC上でVS Codeを立ち上げ、下記の拡張機能をインストールしてください。

- Azure tools
- Azure cli
- C#
- C# extensions
- Auto-using for c#
- Nuget package manager

  VS Codeの拡張機能のインストール方法については、[Visual Studio Code Docs](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-an-extension) を参照してください。

### 3. リポジトリをCloneする

任意のディレクトリに本リポジトリを含む2つのリポジトリをCloneしてください。</br>
gitコマンドを利用する場合は、下記のコマンドを実行してリポジトリをCloneできます。

- WebAppのリポジトリをクローンする

  ```bash
  git clone https://github.com/SonySemiconductorSolutions/aitrios-sdk-zone-detection-webapp-cs.git
  ```

- Functionsのリポジトリをクローンする

  ```bash
  git clone https://github.com/SonySemiconductorSolutions/aitrios-sdk-zone-detection-functions-cs.git  
  ```

その他のClone方法については、[GitHub Docs](https://docs.github.com/ja/repositories/creating-and-managing-repositories/cloning-a-repository)を参照してください。

## 環境構築方法

### 1. アプリケーションを登録する

デプロイ時に利用するアプリケーション (クライアント) IDとディレクトリ (テナント) IDを取得します。

> **Note**
> Azure Active Directory認証(以下、AAD認証)を設定しない場合は、下記の手順は不要です。</br>
> 「[2. テンプレートを利用したカスタムデプロイを実行する](#2-テンプレートを利用したカスタムデプロイを実行する)」へ進んでください。

- [Azure Portal ホーム](https://portal.azure.com/#home) へ移動する
- [**Azure サービス**]から[**アプリの登録**]を選択する
- 上部タブから[**新規登録**]を選択する
- アプリケーションの登録画面で、"名前"と"サポートされているアカウントの種類"を入力します</br>
  この"名前"に設定した値が、アプリケーションIDになります。
  
- [**登録**]ボタンを押下する</br>
  登録したアプリの概要ページが表示されます。画面上に表示されている下記の値を控えておいてください。
  - アプリケーション (クライアント) ID
  - ディレクトリ (テナント) ID

### 2. テンプレートを利用したカスタムデプロイを実行する

- [Azure Portal ホーム](https://portal.azure.com/#home) へ移動する
- [**Azure サービス**]から[**リソースグループ**]を選択する
- リソースグループ画面のリストから、利用するリソースグループ名を選択する
- 選択したリソースグループ画面の左サイドバーから[**テンプレートのエクスポート**]を選択する
- 上部タブから[**デプロイ**]を選択し、カスタムデプロイ画面に遷移する
- [**テンプレートの編集**]を選択し、テンプレートの編集画面に遷移する
- 上部タブの[**ファイル読込み**]ボタンを押下し、開くダイアログを起動する
- CloneしたWebAppのリポジトリから、テンプレートファイル **`./deploy/azuredeploy.json`** を選択する
- [**保存**]ボタンを押下して、カスタムデプロイ画面に戻る
- カスタムデプロイ画面で、各項目を入力する

  下表を参考に、各項目を入力してください。
  | 入力項目 | 説明 | 入力例 |
  | ---- | ---- | ---- |
  | [**サブスクリプション**] | ご登録のサブスクリプションを選択します。| サブスクリプション名 |
  | [**リソースグループ**] | ご登録のリソースグループ選択します。 | リソースグループ名 |
  | [**リージョン**] | デプロイ環境のリージョンを設定します。 | (Asia Pacific) Japan East |
  | [**Unique Id**] | ユニーク化するためのIDを設定します。 | デフォルト値を使用 |
  | [**Location**] | リソース配置を設定します。 | [resorceGrorp().location] |
  | [**Web_app_name**] | WebAppのデプロイ先に名前を設定します。</br>※「[1. WebAppをデプロイする](#1-webappをデプロイする)」でこの設定値を参照します。 | 任意 |
  | [**Function_app_name**] | Functionsのデプロイ先に名前を設定します。 | 任意 |
  | [**Signalr_name**] | SignalRの名前を設定します。 | 任意 |
  | [**Eventhub_name**] | Eventhubの名前を設定します。 | 任意 |
  | [**Storage_account_name**] | ストレージアカウントの名前を設定します。| 任意 |
  | [**Storage_account_type**] | ストレージアカウントの種類を設定します。 | Standard_LRS |
  | [**Blob_container_name**] | Blob Containerの名前を設定します。 | 任意 |
  | [**Aitios_url**] | ConsoleのURLを設定します。 | "https://console.aitrios.sony-semicon.com/api/v1" |
  | [**Token_url**] | ConsoleのToken取得のURLを設定します。 | "https://auth.aitrios.sony-semicon.com/oauth2/default/v1/token" |
  | [**Aitrios_client_id**] | AITRIOSのクライアントIDを設定します。 | クライアントID |
  | [**Aitrios_client_secret**] | AITRIOSのシークレットIDを設定します。 | シークレット |
  | [**Aad_tenand_id**] | AAD認証する場合に設定します。 | ディレクトリ (テナント) ID |
  | [**Aad_client_id**] | AAD認証する場合に設定します。 | アプリケーション (クライアント) ID |
  | [**Git_webapp_repo**] | WebAppのリポジトリ情報を設定します。</br>リソース作成時は、デフォルト値を削除し、空にします。 | 空 |
  | [**Git_webapp_branch**] | WebAppのブランチ情報を設定します。</br>リソース作成時は、デフォルト値を削除し、空にします。 | 空 |
  | [**Git_functionsapp_repo**] | Functionsのリポジトリ情報を設定します。</br>リソース作成時は、デフォルト値を削除し、空にします。 | 空 |
  | [**Git_functionsapp_branch**] | Functionsのブランチ情報を設定します。</br>リソース作成時は、デフォルト値を削除し、空にします。 | 空 |

- [**確認と作成**]ボタンを押下する

  > **Note**
  > ご契約条件が表示されます。内容をよくご確認の上、次の手順へ進んでください。

- [**作成**]ボタンを押下して、デプロイ処理を開始する

  > **Note**
  > デプロイ処理は、ある程度時間を要します。</br>
  > デプロイが完了すると、Azureのデプロイ画面で「デプロイが完了しました」の文言が表示されます。

### 3. WebAppの認証を追加する

「[1. アプリケーションを登録する](#1-アプリケーションを登録する)」で作成したアプリの登録に、デプロイしたApp Serviceの認証を追加します。

> **Note**
> AAD認証を設定しない場合は、下記の手順は不要です。</br>
> [デプロイ方法](#デプロイ方法) へ進んでください。

- [Azure Portal ホーム](https://portal.azure.com/#home) へ移動する
- [**Azure サービス**]から[**App Service**]を選択する
- App Service画面のリストから 「[2. テンプレートを利用したカスタムデプロイを実行する](#2-テンプレートを利用したカスタムデプロイを実行する)」で作成した[**Web_app_name**]を選択する</br>
  App Serviceの概要ページが表示されます。画面上に表示されている下記の値を控えておいてください。
  - URL
- [Azure Portal ホーム](https://portal.azure.com/#home) へ移動する
- [**Azure サービス**]から[**アプリの登録**]を選択する
- アプリの登録画面のリストから、「[1. アプリケーションを登録する](#1-アプリケーションを登録する)」で作成したアプリケーションを選択する
- 左サイドバーから[**認証**]を選択する
- 認証画面の[**プラットフォーム構成**]から[**プラットフォームの追加**]を選択する
- 右側に表示されるスライドバーから[**Web**]を選択する
- Webの構成画面で[**リダイレクトURI**]に、App Service画面で取得したURLに **`/signin-oidc`** を付けた値を設定する
- [**暗黙的な許可およびハイブリッドフロー**]の[**ID トークン (暗黙的およびハイブリッド フローに使用)**]をチェックする
- [**構成**]ボタンを押下する

## デプロイ方法

### 1. WebAppをデプロイする

- CloneしたWebAppのリポジトリをVS Codeで開く
- VS Codeのターミナルを開き、下記のコマンドを実行する

  ```bash
  cd ZoneDetection
  dotnet restore
  dotnet publish -c release
  ```

- アクティビティバーの[**Azure機能拡張**]ボタンをクリックし、Azureへサインインする
- サイドバーに表示されるApp Serviceのリストから、「[2. テンプレートを利用したカスタムデプロイを実行する](#2-テンプレートを利用したカスタムデプロイを実行する)」で設定した[**Web_app_name**]を右クリックする
- コンテキストメニューから[**Deploy to Web App...**]を選択する

  ![WebApp_deploy](WebApp_deploy.png)

- コマンドパレット上にパス選択のダイアログで、現在のフォルダを選択する
- デプロイ確認ダイアログが起動するので、[**Deploy**]ボタンを押下する
- デプロイが正常に完了すると、「 Deployment to [**Web_app_name**] completed. 」のポップアップが表示されます。

</br>

### 2. Functionsをデプロイする

- CloneしたFunctionsのリポジトリをVS Codeで開く
- VS Codeのターミナルを開き、下記のコマンドを実行する

  ```bash
  cd ZoneDetection
  dotnet restore
  dotnet publish -c release
  ```

- アクティビティバーの[**Azure機能拡張**]ボタンをクリックし、Azureへサインインする
- サイドバーに表示されるFunctionsのリストから、「[2. テンプレートを利用したカスタムデプロイを実行する](#2-テンプレートを利用したカスタムデプロイを実行する)」で設定した[**Function_app_name**]を右クリックする
- コンテキストメニューから[**Deploy to Function App...**]を選択する

  ![Functions_deploy](Functions_deploy.png)

- コマンドパレット上にパス選択のダイアログで、現在のフォルダを選択する
- デプロイ確認ダイアログが起動するので、[**Deploy**]ボタンを押下する
- デプロイが正常に完了すると、「 Deployment to [**Function_app_name**] completed. 」のポップアップが表示されます。

## Consoleに外部転送の設定をする

外部転送の設定は、Console APIで実行します。

### 1. トークン情報を取得する

デプロイしたWebAppにアクセスして、Console APIの実行に必要となるトークン情報を取得します。</br>
下記の手順にて、WebAppのURLを取得し、ブラウザからアクセスしてください。

- [Azure Portal ホーム](https://portal.azure.com/#home) へ移動する
- [**Azure サービス**]から[**App Service**]を選択する
- App Service画面のリストから 「[2. テンプレートを利用したカスタムデプロイを実行する](#2-テンプレートを利用したカスタムデプロイを実行する)」で作成した[**Web_app_name**]を選択する</br>
  App Serviceの概要ページが表示されます。画面上に表示されている[**URL**]が、WebAppへのリンクになっています。
- リンク先のページを開く
- 画面左上の[**Option**]タブを選択し、Option画面を表示する
- [**Get Token**]ボタンを押下する
- [**Token**]に出力されたトークン情報を控える

### 2. Event Hubsの情報を取得する

UpdateIRHubConnector APIのパラメータとなるEvent Hubsの情報を取得します。

- [Azure Portal ホーム](https://portal.azure.com/#home) へ移動する
- [**Azure サービス**]から[**Event Hubs**]を選択する
- Event Hubs画面のリストから 「[2. テンプレートを利用したカスタムデプロイを実行する](#2-テンプレートを利用したカスタムデプロイを実行する)」で作成した[**Eventhub_name**]を選択する
- 左サイドバーから[**共有アクセスポリシー**]を選択する
- ポリシーのリストから **`RootManageSharedAccessKey`** を選択する</br>
  右側に表示されるスライドバーの[**接続文字列 – 主キー**]に出力された接続文字列を控える

### 3. UpdateIRHubConnector APIを実行する

取得したトークン情報と接続文字列を使ってUpdateIRHubConnector APIを実行します。</br>
REST APIの詳細については、[デベロッパーエディションREST API](https://developer.aitrios.sony-semicon.com/development-guides/reference/api-references/) を参照してください。</br>
下記の手順は、Postmanを利用した実行例です。

- Postmanで新規のPUTリクエストを作成する
- URLに **`https://console.aitrios.sony-semicon.com/api/v1/connector/ir_hub`** を設定する
- [**Auth**]タブに切り替え、[**Type**]を **`Bearer Token`** に設定する
- [**Token**]に取得したトークン情報を設定する
- [**Body**]タブに切り替え、入力形式を **`raw`** の **`JSON`** に指定する
- 必要なパラメータをJSONで設定する</br>
  下記は、Bodyデータの設定例です。環境にあわせ設定してください。

  ```JSON
  {
    "url": "接続文字列",
    "name": "[Eventhub_name]"
  }
  ```

  > **Note** [**Eventhub_name**]は、「[2. テンプレートを利用したカスタムデプロイを実行する](#2-テンプレートを利用したカスタムデプロイを実行する)」で作成した値です。

- [**Send**]ボタンを押下し、レスポンスを確認する</br>
  正常終了時は、レスポンスコード"200"を受信します。

### 4. ストレージアカウントの情報を取得する

- [Azure Portal ホーム](https://portal.azure.com/#home) へ移動する
- [**Azure サービス**]から[**ストレージアカウント**]を選択する
- ストレージアカウント画面のリストから 「[2. テンプレートを利用したカスタムデプロイを実行する](#2-テンプレートを利用したカスタムデプロイを実行する)」で作成した[**Storage_account_name**]を選択する
- 左サイドバーから[**エンドポイント**]を選択する
- [**Blob service**]の項目に記載されたURLをエンドポイントとして控える
- 左サイドバーから[**アクセスキー**]を選択する
- [**key1**]の接続文字列を[**表示**]ボタンを押下し、コピーして控える

### 5. UpdateStorageConnector APIを実行する

取得したトークン情報と接続文字列を使ってUpdateStorageConnector APIを実行します。</br>
REST APIの詳細については、[デベロッパーエディションREST API](https://developer.aitrios.sony-semicon.com/development-guides/reference/api-references/) を参照してください。</br>
下記の手順は、Postmanを利用した実行例です。

- Postmanで新規のPUTリクエストを作成する
- URLに **`https://console.aitrios.sony-semicon.com/api/v1/connector/storage`** を設定する
- [**Auth**]タブに切り替え、[**Type**]を **`Bearer Token`** に設定する
- [**Token**]に取得したトークン情報を設定する
- [**Body**]タブに切り替え、入力形式を **`raw`** の **`JSON`** に指定する
- 必要なパラメータをJSONで設定する</br>
  下記は、Bodyデータの設定例です。環境にあわせ設定してください。

  ```JSON
  {
    "endpoint": "エンドポイント",
    "connection_string": "接続文字列",
    "container_name": "[Blob_container_name]"
  }
  ```

  > **Note** [**Blob_container_name**]は、「[2. テンプレートを利用したカスタムデプロイを実行する](#2-テンプレートを利用したカスタムデプロイを実行する)」で作成した値です。

- [**Send**]ボタンを押下し、レスポンスを確認する</br>
  正常終了時は、レスポンスコード"200"を受信します。

## 制限事項

- なし
