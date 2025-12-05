/**
 * Script test kết nối với máy chấm công ZKTeco SmartFace 680
 * IP: 192.168.1.226
 * Port: 4370 (mặc định của ZKTeco)
 */

const net = require('net');

// Thông tin máy chấm công
const DEVICE_IP = '192.168.1.226';
const DEVICE_PORT = 4370;
const TIMEOUT = 5000; // 5 seconds

console.log('🔌 Đang test kết nối với máy ZKTeco SmartFace 680...');
console.log(`📍 IP: ${DEVICE_IP}`);
console.log(`🔌 Port: ${DEVICE_PORT}`);
console.log('');

// Test 1: Kiểm tra kết nối TCP/IP cơ bản
function testTCPConnection() {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let connected = false;

        socket.setTimeout(TIMEOUT);

        socket.on('connect', () => {
            connected = true;
            console.log('✅ Kết nối TCP/IP thành công!');
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            console.log('⏱️  Timeout: Không thể kết nối trong thời gian cho phép');
            socket.destroy();
            reject(new Error('Connection timeout'));
        });

        socket.on('error', (err) => {
            if (!connected) {
                console.log('❌ Lỗi kết nối:', err.message);
                reject(err);
            }
        });

        socket.connect(DEVICE_PORT, DEVICE_IP);
    });
}

// Test 2: Gửi lệnh ZKTeco cơ bản (nếu kết nối thành công)
function testZKTecoCommand() {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let connected = false;

        socket.setTimeout(TIMEOUT);

        socket.on('connect', () => {
            connected = true;
            console.log('✅ Đã kết nối, đang gửi lệnh test...');
            
            // ZKTeco command để lấy thông tin thiết bị (CMD_DEVICE)
            // Format: [0x50, 0x50, 0x82, 0x7D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
            const command = Buffer.from([
                0x50, 0x50, 0x82, 0x7D, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
            ]);

            socket.write(command);

            // Đợi response
            socket.once('data', (data) => {
                console.log('📥 Nhận được response từ thiết bị:');
                console.log('   Length:', data.length, 'bytes');
                console.log('   Data:', data.toString('hex'));
                socket.destroy();
                resolve(data);
            });
        });

        socket.on('timeout', () => {
            console.log('⏱️  Timeout: Không nhận được response');
            socket.destroy();
            reject(new Error('Response timeout'));
        });

        socket.on('error', (err) => {
            if (!connected) {
                console.log('❌ Lỗi:', err.message);
                reject(err);
            }
        });

        socket.connect(DEVICE_PORT, DEVICE_IP);
    });
}

// Chạy tests
async function runTests() {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 1: Kiểm tra kết nối TCP/IP');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await testTCPConnection();
        
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 2: Gửi lệnh ZKTeco');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await testZKTecoCommand();
        
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Tất cả tests hoàn thành!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('💡 Lưu ý:');
        console.log('   - Nếu kết nối thành công, bạn có thể tích hợp với máy');
        console.log('   - Để lấy dữ liệu chấm công, cần sử dụng ZKTeco SDK');
        console.log('   - Có thể cài đặt: npm install zkteco-sdk');
        
        process.exit(0);
    } catch (error) {
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ Test thất bại!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('🔍 Nguyên nhân có thể:');
        console.log('   1. Máy chấm công không online');
        console.log('   2. IP address không đúng');
        console.log('   3. Port bị chặn bởi firewall');
        console.log('   4. Máy không cùng mạng LAN');
        console.log('');
        console.log('💡 Giải pháp:');
        console.log('   - Kiểm tra máy chấm công đang hoạt động');
        console.log('   - Ping IP: ping 192.168.1.226');
        console.log('   - Kiểm tra firewall/antivirus');
        console.log('   - Đảm bảo máy tính và máy chấm công cùng mạng');
        
        process.exit(1);
    }
}

// Chạy
runTests();

