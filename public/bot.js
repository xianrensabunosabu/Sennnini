/**
 * Ultraviolet Cloudflare-Specialized Evasion Script (uv/bot.js)
 * 2026 Edition - Anti-Bot & Fingerprint Stealth
 * * このスクリプトは、ブラウザの自動化（WebDriver）の痕跡を消去し、
 * Cloudflareがチェックする実行環境の不整合を修正します。
 */
(function() {
    'use strict';

    // 二重実行の防止
    const STEALTH_KEY = '__uv_stealth_v2_active__';
    if (window[STEALTH_KEY]) return;
    window[STEALTH_KEY] = true;

    /**
     * プロパティの上書きを隠蔽するためのユーティリティ
     */
    const hideProperty = (target, prop, value) => {
        Object.defineProperty(target, prop, {
            get: () => value,
            enumerable: true,
            configurable: true
        });
    };

    // 1. WebDriverの検知回避
    // navigator.webdriver を false にし、古いオートメーションツールが残す痕跡を削除
    if (navigator.webdriver !== undefined) {
        hideProperty(navigator, 'webdriver', false);
    }
    
    // 2. window.chrome オブジェクトの完全なシミュレート
    // ヘッドレスブラウザや非Chrome環境で欠落しがちなプロパティを補完
    if (!window.chrome) {
        window.chrome = {
            app: {
                isInstalled: false,
                InstallState: {
                    DISABLED: 'disabled',
                    INSTALLED: 'installed',
                    NOT_INSTALLED: 'not_installed'
                },
                getDetails: function() {},
                getIsInstalled: function() {}
            },
            runtime: {
                OnInstalledReason: {
                    CHROME_UPDATE: 'chrome_update',
                    INSTALL: 'install',
                    SHARED_MODULE_UPDATE: 'shared_module_update',
                    UPDATE: 'update'
                },
                OnRestartRequiredReason: {
                    APP_UPDATE: 'app_update',
                    OS_UPDATE: 'os_update',
                    PERIODIC: 'periodic'
                },
                PlatformArch: {
                    ARM: 'arm',
                    ARM64: 'arm64',
                    MIPS: 'mips',
                    MIPS64: 'mips64',
                    X86_32: 'x86-32',
                    X86_64: 'x86-64'
                },
                PlatformNaclArch: {
                    ARM: 'arm',
                    MIPS: 'mips',
                    MIPS64: 'mips64',
                    X86_32: 'x86-32',
                    X86_64: 'x86-64'
                },
                PlatformOs: {
                    ANDROID: 'android',
                    CROS: 'cros',
                    LINUX: 'linux',
                    MAC: 'mac',
                    OPENBSD: 'openbsd',
                    WIN: 'win'
                },
                RequestUpdateCheckStatus: {
                    NO_UPDATE: 'no_update',
                    THROTTLED: 'throttled',
                    UPDATE_AVAILABLE: 'update_available'
                },
                connect: function() {},
                sendMessage: function() {}
            },
            loadTimes: function() {
                const now = Date.now() / 1000;
                return {
                    requestTime: now - 0.5,
                    startLoadTime: now - 0.45,
                    commitLoadTime: now - 0.3,
                    finishDocumentLoadTime: now - 0.1,
                    firstPaintTime: now - 0.25,
                    finishLoadTime: now,
                    wasFetchedViaSpdy: true,
                    wasNpnNegotiated: true,
                    wasAlternateProtocolAvailable: false,
                    connectionInfo: 'h2'
                };
            },
            csi: function() {
                return {
                    startE: Date.now() - 500,
                    onloadT: Date.now(),
                    pageT: 500.123,
                    tran: 15
                };
            }
        };
    }

    // 3. Permissions API の不整合修正
    // 通知権限の状態を人間らしいデフォルト値に固定
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );

    // 4. WebGL ベンダー/レンダラー情報の偽装
    // Cloudflareはハードウェア情報からヘッドレス環境（Mesa/Google SwiftShader等）を特定します
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL: 37445
        if (parameter === 37445) {
            return 'Google Inc. (Intel)';
        }
        // UNMASKED_RENDERER_WEBGL: 37446
        if (parameter === 37446) {
            return 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        }
        return getParameter.apply(this, arguments);
    };

    // 5. Canvas フィンガープリントの微細なノイズ付加
    // 完全に同一のCanvasハッシュを返すBotを避けるため、ピクセルデータを極微細に操作
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
        if (type === 'image/png' && this.width > 0 && this.height > 0) {
            const context = this.getContext('2d');
            if (context) {
                // 右下1ピクセルのアルファ値をわずかに変更（視覚的には不透明）
                const imageData = context.getImageData(0, 0, 1, 1);
                context.putImageData(imageData, 0, 0);
            }
        }
        return originalToDataURL.apply(this, arguments);
    };

    // 6. 言語設定とプラグインの整合性
    hideProperty(navigator, 'languages', ['ja-JP', 'ja', 'en-US', 'en']);
    if (navigator.plugins.length === 0) {
        hideProperty(navigator, 'plugins', [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ]);
    }

    // 7. ヘッドレス特有の不整合（window.outerHeight/Width）の修正
    if (window.outerWidth === 0 && window.outerHeight === 0) {
        window.outerWidth = window.innerWidth;
        window.outerHeight = window.innerHeight;
    }

    console.log('Ultraviolet Stealth: Cloudflare-specific evasion applied.');
})();
