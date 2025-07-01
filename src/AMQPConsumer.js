const amqp = require('amqplib');

// MQ连接信息
const HOST = 'xxx.xxx.xxx.xxx';
const PORT = 5672;
const USERNAME = 'wbfFUieAoR';
const PASSWORD = 'ctuXCK****';
const QUEUE_NAME = 'queue_GPdMhwpisB';

async function main() {
	try {
		// 建立连接
		const connection = await amqp.connect(
			`amqp://${USERNAME}:${PASSWORD}@${HOST}:${PORT}`
		);
		const channel = await connection.createChannel();

		// 声明队列（如果不存在）
		await channel.assertQueue(QUEUE_NAME, { durable: true });

		console.log('等待接收消息...');

		// 设置消费者
		channel.consume(
			QUEUE_NAME,
			(msg) => {
				if (!msg) {
					console.log('消费者取消');
					return;
				}

				const messageBytes = msg.content;
				const props = msg.properties;
				const headers = props.headers || {};

				// 提取header信息
				const messageId = headers.messageId?.toString();
				const topic = headers.topic?.toString();
				const generateTime = headers.generateTime?.toString();
				let contentType = headers.contentType?.toString() || props.contentType;

				console.log('------ 消息元数据 ------');
				console.log(`MessageId: ${messageId}`);
				console.log(`Topic: ${topic}`);
				console.log(`GenerateTime: ${generateTime}`);
				console.log(`ContentType: ${contentType}`);

				// 判断是否为二进制数据
				let isBinary;
				if (contentType) {
					if (contentType.startsWith('text/')) {
						console.log(`ContentType: ${contentType} (文本类型)`);
						isBinary = false;
					} else if (contentType.startsWith('application/octet-stream')) {
						console.log(`ContentType: ${contentType} (需要进一步分析内容)`);
						isBinary = !isTextContent(messageBytes);
					} else if (
						contentType.startsWith('application/binary') ||
						contentType.startsWith('image/') ||
						contentType.startsWith('audio/') ||
						contentType.startsWith('video/')
					) {
						console.log(`ContentType: ${contentType} (明确的二进制类型)`);
						isBinary = true;
					} else {
						console.log(`ContentType: ${contentType} (未知类型，将分析内容)`);
						isBinary = !isTextContent(messageBytes);
					}
				} else {
					console.log('ContentType为空，将分析内容');
					isBinary = !isTextContent(messageBytes);
				}

				// 处理消息
				if (isBinary) {
					processBinaryMessage(messageBytes, messageId, topic, generateTime);
				} else {
					const originalMessage = messageBytes.toString('utf8');
					console.log(`接收到文本消息: '${originalMessage}'`);
					processTextMessage(originalMessage, messageId, topic, generateTime);
				}
			},
			{ noAck: true }
		); // 自动确认消息

		console.log('按任意键退出程序...');
		process.stdin.resume();
		process.stdin.on('data', async () => {
			await channel.close();
			await connection.close();
			process.exit(0);
		});
	} catch (error) {
		console.error('连接MQ失败: ', error);
	}
}

/**
 * 判断内容是否为文本数据
 */
function isTextContent(data) {
	if (!data || data.length === 0) return true;

	// 尝试解析JSON
	if (isValidJson(data)) {
		console.log('检测到有效的JSON内容');
		return true;
	}

	// 检查可打印字符比例
	let textCharCount = 0;
	for (const b of data) {
		if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) {
			textCharCount++;
		}
	}
	const textRatio = textCharCount / data.length;
	const isText = textRatio > 0.85;

	if (isText) {
		console.log(
			`基于字符分析，判断可能是文本内容 (文本字符比例: ${(
				textRatio * 100
			).toFixed(2)}%)`
		);
	} else {
		console.log(
			`基于字符分析，判断可能是二进制内容 (非文本字符比例: ${(
				(1 - textRatio) *
				100
			).toFixed(2)}%)`
		);
	}

	return isText;
}

/**
 * 验证是否为有效JSON
 */
function isValidJson(data) {
	try {
		const str = data.toString('utf8');
		JSON.parse(str);
		return true;
	} catch (e) {
		return false;
	}
}

/**
 * 处理二进制消息
 */
function processBinaryMessage(messageBytes, messageId, topic, generateTime) {
	console.log(`接收到二进制数据, 大小: ${messageBytes.length} 字节`);
	detectBinaryFormat(messageBytes);

	// 预览前20字节的十六进制
	const previewSize = Math.min(messageBytes.length, 20);
	const hexPreview = Array.from(messageBytes.slice(0, previewSize), (b) =>
		b.toString(16).padStart(2, '0')
	).join(' ');
	console.log(
		`二进制数据预览(十六进制): ${hexPreview}${
			messageBytes.length > 20 ? '...' : ''
		}`
	);
}

/**
 * 检测二进制数据的格式
 */
function detectBinaryFormat(data) {
	if (data.length < 4) {
		console.log('二进制数据太短，无法判断格式');
		return;
	}

	const first4 = data.slice(0, 4);
	if (first4[0] === 0xff && first4[1] === 0xd8) {
		console.log('检测到可能是JPEG图像数据');
	} else if (
		first4[0] === 0x89 &&
		first4[1] === 0x50 &&
		first4[2] === 0x4e &&
		first4[3] === 0x47
	) {
		console.log('检测到可能是PNG图像数据');
	} else if (first4[0] === 0x47 && first4[1] === 0x49 && first4[2] === 0x46) {
		console.log('检测到可能是GIF图像数据');
	} else if (first4[0] === 0x50 && first4[1] === 0x4b) {
		console.log('检测到可能是ZIP/JAR等压缩格式');
	} else if (
		first4[0] === 0x25 &&
		first4[1] === 0x50 &&
		first4[2] === 0x44 &&
		first4[3] === 0x46
	) {
		console.log('检测到可能是PDF文档');
	} else if (data.length >= 2) {
		const first2 = data.slice(0, 2);
		if (
			(first2[0] === 0xfe && first2[1] === 0xff) ||
			(first2[0] === 0xff && first2[1] === 0xfe)
		) {
			console.log('检测到可能是带BOM的Unicode文本');
			try {
				const encoding = first2[0] === 0xfe ? 'utf16be' : 'utf16le';
				const text = data.toString(encoding);
				const preview = text.length > 100 ? text.slice(0, 100) + '...' : text;
				console.log(`Unicode文本预览 (${encoding}): ${preview}`);
			} catch (e) {
				console.warn('Unicode解码失败:', e);
			}
		} else {
			console.log('未能识别的二进制格式');
		}
	} else {
		console.log('未能识别的二进制格式');
	}
}

/**
 * 处理接收到的文本消息
 */
function processTextMessage(message, messageId, topic, generateTime) {
	// 处理可能的额外引号
	let processedMessage = message;
	if (message.startsWith('"') && message.endsWith('"')) {
		try {
			// 尝试使用JSON.parse移除引号并处理转义字符
			processedMessage = JSON.parse(message);
			console.log(`处理后的消息 (去掉额外引号): '${processedMessage}'`);
		} catch (e) {
			// 如果解析失败，仅简单移除首尾引号
			processedMessage = message.slice(1, -1);
		}
	}

	// 尝试解析JSON
	try {
		const jsonData = JSON.parse(processedMessage);
		// 格式化JSON输出
		const prettyJson = JSON.stringify(jsonData, null, 2);
		console.log(`格式化的JSON:\n${prettyJson}`);

		// 提取并显示topic字段
		if (jsonData.topic) {
			console.log(`消息内容中的Topic字段: ${jsonData.topic}`);
		}

		// 检查是否有content字段，并尝试解析
		if (jsonData.content) {
			try {
				// 尝试将content解析为JSON
				const contentJson =
					typeof jsonData.content === 'string'
						? JSON.parse(jsonData.content)
						: jsonData.content;
				const prettyContent = JSON.stringify(contentJson, null, 2);
				console.log(`内层content字段 (格式化):\n${prettyContent}`);

				// 检查内层JSON中是否有topic字段
				if (contentJson.topic) {
					console.log(`内层消息中的Topic字段: ${contentJson.topic}`);
				}
			} catch (e) {
				// content不是有效的JSON，显示原始内容
				console.log(`content字段 (非JSON): ${jsonData.content}`);
			}
		}
	} catch (e) {
		// 不是有效的JSON，显示为普通文本
		console.log(`消息不是有效的JSON格式，以纯文本显示:\n${processedMessage}`);
	}
}
