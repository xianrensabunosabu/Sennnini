/*global Ultraviolet*/
self.__uv$config = {
    /**
     * プロキシされるURLの前に付くプレフィックス
     */
    prefix: '/service/',

    /**
     * サーバー側のBare Serverのエンドポイント
     * server.mjs で createBareServer('/bare/') と設定したパスに合わせます
     */
    bare: '/bare/',

    /**
     * エンコード方式（URLを隠読化する設定）
     */
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,

    /**
     * 各ライブラリファイルのパス
     */
    handler: '/uv/uv.handler.js',
    bundle: '/uv/uv.bundle.js',
    config: '/uv/uv.config.js',
    sw: '/uv/uv.sw.js',
};
