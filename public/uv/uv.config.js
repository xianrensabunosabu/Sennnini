self.__uv$config = {
    prefix: '/uv/service/',
    bare: '/bare/',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: '/uv/uv.handler.js',
    client: '/uv/uv.client.js',
    bundle: '/uv/uv.bundle.js',
    config: '/uv/uv.config.js',
    sw: '/uv/uv.sw.js',
    /**
     * Bot検知回避のための追加設定
     * クライアント側で注入されるヘッダーをブラウザの挙動によせる。
     */
    inject: [
        {
            host: /.*/,
            injectTo: 'head',
            content: `<script>
                // Webdriverの痕跡を消去
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                // 言語設定を固定して一貫性を持たせる
                Object.defineProperty(navigator, 'languages', {get: () => ['ja-JP', 'ja', 'en-US', 'en']});
            </script>`,
        },
    ],
};
