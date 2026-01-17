import Document, { Html, Head, Main, NextScript } from "next/document";
import React from "react";

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="ko">
        <Head>
          <meta name="description" content="간편하게 설문을 만들고 배포하세요" />
          <meta name="keywords" content="설문조사, survey, 설문 생성, 설문 배포" />
          <meta name="author" content="Survey System" />
          <meta property="og:title" content="설문조사 시스템" />
          <meta property="og:description" content="간편하게 설문을 만들고 배포하세요" />
          <meta property="og:type" content="website" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="preconnect" href="https://cdn.jsdelivr.net" />
          <link 
            rel="stylesheet" 
            href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" 
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

