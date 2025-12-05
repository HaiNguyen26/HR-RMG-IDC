/**
 * Script test kết nối với máy chấm công ZKTeco SmartFace 680
 * IP: 192.168.1.226
 * Port: 4370
 */

const net = require('net');

// Thông tin máy chấm công
const DEVICE_CONFIG = {
    // IP private của máy (trong mạng LAN)
    privateIP: '192.168.1.226',
    // IP public (có thể là IP của EPAD server, không phải máy chấm công)
    publicIP: '115.73.210.113',
    port: 4370,
    timeout: 5000 // 5 seconds
};

/**
 * Test kết nối TCP với máy chấm công
 */
function testConnection(host, port, timeout) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔍 Đang test kết nối đến ${host}:${port}...`);

        const socket = new net.Socket();
        let connected = false;

        // Set timeout
        socket.setTimeout(timeout);

        // Khi kết nối thành công
        socket.on('connect', () => {
            connected = true;
            console.log(`✅ Kết nối thành công đến ${host}:${port}`);
            console.log(`   Local address: ${socket.localAddress}:${socket.localPort}`);
            console.log(`   Remote address: ${socket.remoteAddress}:${socket.remotePort}`);

            // Gửi command test (ZKTeco protocol)
            // Command để lấy thông tin thiết bị
            const testCommand = Buffer.from([0x50, 0x50, 0x82, 0x7D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

            socket.write(testCommand);

            // Đóng kết nối sau 2 giây
            setTimeout(() => {
                socket.destroy();
                resolve({
                    success: true,
                    host,
                    port,
                    message: 'Kết nối thành công'
                });
            }, 2000);
        });

        // Khi nhận được data
        socket.on('data', (data) => {
            console.log(`📥 Nhận được data từ máy (${data.length} bytes):`);
            console.log(`   Hex: ${data.toString('hex')}`);
            console.log(`   Raw: ${data.toString()}`);
        });

        // Khi có lỗi
        socket.on('error', (error) => {
            if (!connected) {
                console.log(`❌ Lỗi kết nối đến ${host}:${port}:`);
                console.log(`   ${error.message}`);
                resolve({
                    success: false,
                    host,
                    port,
                    error: error.message
                });
            }
        });

        // Khi timeout
        socket.on('timeout', () => {
            console.log(`⏱️  Timeout khi kết nối đến ${host}:${port}`);
            socket.destroy();
            resolve({
                success: false,
                host,
                port,
                error: 'Connection timeout'
            });
        });

        // Khi đóng kết nối
        socket.on('close', () => {
            if (connected) {
                console.log(`🔌 Đã đóng kết nối với ${host}:${port}`);
            }
        });

        // Thử kết nối
        socket.connect(port, host);
    });
}

/**
 * Test ping đến host (kiểm tra host có online không)
 */
function testPing(host) {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        const isWindows = process.platform === 'win32';
        const pingCommand = isWindows
            ? `ping -n 2 ${host}`
            : `ping -c 2 ${host}`;

        console.log(`\n🏓 Đang ping ${host}...`);

        exec(pingCommand, (error, stdout, stderr) => {
            if (error) {
                console.log(`❌ Không thể ping ${host}`);
                resolve(false);
            } else {
                console.log(`✅ Ping thành công đến ${host}`);
                console.log(stdout);
                resolve(true);
            }
        });
    });
}

/**
 * Main function
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🧪 TEST KẾT NỐI MÁY CHẤM CÔNG ZKTECO SMARTFACE 680');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n📋 Thông tin máy:`);
    console.log(`   IP Private: ${DEVICE_CONFIG.privateIP}`);
    console.log(`   IP Public: ${DEVICE_CONFIG.publicIP}`);
    console.log(`   Port: ${DEVICE_CONFIG.port}`);

    const results = [];

    // Test 1: Ping IP private
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Ping IP Private');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const pingPrivate = await testPing(DEVICE_CONFIG.privateIP);

    // Test 2: Kết nối TCP đến IP private
    if (pingPrivate) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 2: Kết nối TCP đến IP Private');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const result1 = await testConnection(
            DEVICE_CONFIG.privateIP,
            DEVICE_CONFIG.port,
            DEVICE_CONFIG.timeout
        );
        results.push(result1);
    } else {
        console.log('\n⚠️  Bỏ qua test TCP vì không ping được IP private');
        console.log('   (Có thể máy chấm công không cùng mạng LAN)');
    }

    // Test 3: Ping IP public
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Ping IP Public');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const pingPublic = await testPing(DEVICE_CONFIG.publicIP);

    // Test 4: Kết nối TCP đến IP public (nếu ping được)
    if (pingPublic) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 4: Kết nối TCP đến IP Public');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  Lưu ý: IP public có thể là IP của EPAD server, không phải máy chấm công');
        const result2 = await testConnection(
            DEVICE_CONFIG.publicIP,
            DEVICE_CONFIG.port,
            DEVICE_CONFIG.timeout
        );
        results.push(result2);
    }

    // Tổng kết
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 KẾT QUẢ TỔNG KẾT');
    console.log('═══════════════════════════════════════════════════════');

    results.forEach((result, index) => {
        console.log(`\nTest ${index + 1}: ${result.host}:${result.port}`);
        if (result.success) {
            console.log(`   ✅ ${result.message}`);
        } else {
            console.log(`   ❌ ${result.error}`);
        }
    });

    const successCount = results.filter(r => r.success).length;
    console.log(`\n📈 Tổng kết: ${successCount}/${results.length} kết nối thành công`);

    if (successCount === 0) {
        console.log('\n💡 Gợi ý:');
        console.log('   1. Kiểm tra máy chấm công có đang bật không');
        console.log('   2. Kiểm tra IP và port có đúng không');
        console.log('   3. Kiểm tra firewall có chặn port 4370 không');
        console.log('   4. Nếu IP private không kết nối được, có thể máy không cùng mạng LAN');
        console.log('   5. Nếu IP public không kết nối được, có thể cần port forwarding hoặc VPN');
        console.log('   6. Cân nhắc tích hợp qua EPAD API thay vì kết nối trực tiếp');
    } else {
        console.log('\n✅ Có thể kết nối trực tiếp với máy chấm công!');
        console.log('   Bước tiếp theo: Tích hợp ZKTeco SDK để lấy dữ liệu chấm công');
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
}

// Chạy script
main().catch(console.error);


