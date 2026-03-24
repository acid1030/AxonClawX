/**
 * Compression Middleware Examples
 * 
 * 压缩中间件使用示例
 * 
 * @author Axon
 * @version 1.0.0
 */

import express from 'express';
import { compression, compress } from './compression';

// ============ 示例 1: 基础用法 ============

function example1_basic() {
  const app = express();

  // 使用默认配置启用压缩
  app.use(compression());

  app.get('/api/data', (req, res) => {
    res.json({
      message: 'This response will be automatically compressed if larger than 1KB',
      data: Array(50).fill({ item: 'Sample data for compression testing' }),
    });
  });

  app.listen(3001, () => {
    console.log('Example 1: Server running on port 3001 with basic compression');
  });
}

// ============ 示例 2: 自定义配置 ============

function example2_customConfig() {
  const app = express();

  app.use(
    compression({
      threshold: 2048, // 2KB 以上才压缩
      level: 9, // 最大压缩级别 (1-9)
      algorithm: 'gzip',
      contentTypes: [
        /text\//i,
        /application\/json/i,
        /application\/javascript/i,
        /image\/svg\+xml/i,
      ],
      skipIfAlreadyCompressed: true,
    })
  );

  app.get('/api/large-response', (req, res) => {
    // 这个大响应会被压缩
    res.json({
      users: Array(200).fill({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        description: 'This is a detailed description to increase response size',
      }),
    });
  });

  app.listen(3002, () => {
    console.log('Example 2: Server running on port 3002 with custom compression config');
  });
}

// ============ 示例 3: 使用预设配置 ============

function example3_presets() {
  const app = express();

  // 根据环境选择预设
  if (process.env.NODE_ENV === 'production') {
    // 生产环境：高压缩率
    app.use(compress.production());
  } else {
    // 开发环境：快速压缩
    app.use(compress.development());
  }

  app.get('/api/users', (req, res) => {
    res.json({ users: [] });
  });

  app.listen(3003, () => {
    console.log(`Example 3: Server running on port 3003 with ${process.env.NODE_ENV} preset`);
  });
}

// ============ 示例 4: 仅压缩 JSON ============

function example4_jsonOnly() {
  const app = express();

  // 只压缩 JSON 响应，其他类型不压缩
  app.use(compress.jsonOnly());

  app.get('/api/data', (req, res) => {
    res.json({ message: 'This JSON will be compressed' });
  });

  app.get('/api/text', (req, res) => {
    res.send('This plain text will NOT be compressed');
  });

  app.listen(3004, () => {
    console.log('Example 4: Server running on port 3004 with JSON-only compression');
  });
}

// ============ 示例 5: 自定义过滤器 ============

function example5_customFilter() {
  const app = express();

  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) => {
        // 跳过健康检查端点
        if (req.path === '/health' || req.path === '/ping') {
          return false;
        }

        // 跳过 curl 请求 (方便调试)
        const userAgent = req.headers['user-agent'] || '';
        if (userAgent.includes('curl')) {
          return false;
        }

        // 跳过特定内容类型
        const contentType = res.getHeader('Content-Type') || '';
        if (String(contentType).includes('image/')) {
          return false;
        }

        return true;
      },
    })
  );

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' }); // 不会被压缩
  });

  app.get('/api/data', (req, res) => {
    res.json({ data: Array(100).fill('test') }); // 会被压缩
  });

  app.listen(3005, () => {
    console.log('Example 5: Server running on port 3005 with custom filter');
  });
}

// ============ 示例 6: 激进压缩模式 ============

function example6_aggressive() {
  const app = express();

  // 激进模式：512B 阈值，最大压缩
  // 适合带宽敏感或慢速网络场景
  app.use(compress.aggressive());

  app.get('/api/response', (req, res) => {
    res.json({
      message: 'Even small responses will be compressed in aggressive mode',
    });
  });

  app.listen(3006, () => {
    console.log('Example 6: Server running on port 3006 with aggressive compression');
  });
}

// ============ 示例 7: 完整生产配置 ============

function example7_production() {
  const app = express();

  // 1. 基础中间件
  app.use(express.json());
  app.use(express.text());

  // 2. 压缩中间件 (在路由之前)
  app.use(
    compression({
      threshold: 1024,
      level: 6, // 平衡压缩率和 CPU 使用
      algorithm: 'gzip',
      contentTypes: [
        /text\/html/i,
        /text\/css/i,
        /text\/javascript/i,
        /application\/json/i,
        /application\/javascript/i,
        /application\/xml/i,
        /image\/svg\+xml/i,
      ],
      skipIfAlreadyCompressed: true,
      filter: (req, res) => {
        // 跳过静态资源 (假设由其他中间件处理)
        if (req.path.startsWith('/static/')) {
          return false;
        }
        // 跳过 API 版本检查端点
        if (req.path === '/api/version') {
          return false;
        }
        return true;
      },
    })
  );

  // 3. 路由
  app.get('/api/version', (req, res) => {
    res.json({ version: '1.0.0' }); // 不会被压缩
  });

  app.get('/api/users', (req, res) => {
    res.json({
      users: Array(100).fill({
        id: 1,
        name: 'User Name',
        email: 'user@example.com',
        bio: 'This is a user biography to increase the response size for compression testing.',
      }),
    }); // 会被压缩
  });

  app.get('/api/static', (req, res) => {
    res.send('<html><body>Static content</body></html>'); // 不会被压缩 (路径过滤)
  });

  // 4. 启动服务器
  const PORT = process.env.PORT || 3007;
  app.listen(PORT, () => {
    console.log(`Example 7: Production server running on port ${PORT}`);
    console.log('Compression enabled with production config');
  });
}

// ============ 示例 8: 查看压缩统计 ============

function example8_compressionStats() {
  const app = express();

  app.use(compression({ threshold: 512 }));

  // 添加中间件记录压缩统计
  app.use((req, res, next) => {
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const stats = res.getHeader('X-Compression-Stats');
      if (stats) {
        console.log(`[Compression] ${req.method} ${req.path}: ${stats}`);
      }
      return originalEnd.apply(res, args);
    };
    next();
  });

  app.get('/api/test', (req, res) => {
    res.json({
      message: 'Check server logs for compression statistics',
      data: Array(50).fill('This is test data to make the response larger'),
    });
  });

  app.listen(3008, () => {
    console.log('Example 8: Server running on port 3008 with compression logging');
    console.log('Check server logs to see compression statistics');
  });
}

// ============ 示例 9: 与其他中间件配合 ============

function example9_withOtherMiddleware() {
  const app = express();

  // 正确的中间件顺序很重要!

  // 1. 安全相关中间件 (最前)
  // app.use(helmet());

  // 2. CORS (在压缩之前)
  // app.use(cors());

  // 3. Body parsers (必须在压缩之前)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 4. 日志中间件 (在压缩之前，记录原始请求)
  // app.use(requestLogger());

  // 5. 压缩中间件 (在 body-parser 之后，路由之前)
  app.use(compress.production());

  // 6. 路由
  app.post('/api/data', (req, res) => {
    // req.body 已经解析
    res.json({
      received: req.body,
      message: 'Response will be compressed if large enough',
    });
  });

  app.listen(3009, () => {
    console.log('Example 9: Server running on port 3009 with proper middleware order');
  });
}

// ============ 示例 10: TypeScript 完整项目 ============

function example10_typescriptProject() {
  const app = express();

  // 使用类型安全的配置
  app.use(
    compression({
      threshold: 1024,
      level: 6,
      algorithm: 'gzip',
      skipIfAlreadyCompressed: true,
      filter: (req, res) => {
        // 类型安全的过滤器
        const path: string = req.path;
        const userAgent: string | undefined = req.headers['user-agent'];

        if (path === '/health') {
          return false;
        }

        if (userAgent && userAgent.includes('bot')) {
          return false;
        }

        return true;
      },
    })
  );

  // 类型安全的路由处理器
  interface UserData {
    id: number;
    name: string;
    email: string;
  }

  interface ApiResponse {
    success: boolean;
    data: UserData[];
    timestamp: string;
  }

  app.get('/api/users', (req, res) => {
    const response: ApiResponse = {
      success: true,
      data: Array(100).fill({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      }),
      timestamp: new Date().toISOString(),
    };

    res.json(response); // 会被压缩
  });

  app.listen(3010, () => {
    console.log('Example 10: TypeScript server running on port 3010');
  });
}

// ============ 运行示例 ============

// 取消注释以运行特定示例
// example1_basic();
// example2_customConfig();
// example3_presets();
// example4_jsonOnly();
// example5_customFilter();
// example6_aggressive();
// example7_production();
// example8_compressionStats();
// example9_withOtherMiddleware();
// example10_typescriptProject();

// ============ 测试示例 ============

/**
 * 使用 curl 测试压缩:
 * 
 * # 发送带 Accept-Encoding 头的请求
 * curl -H "Accept-Encoding: gzip" http://localhost:3001/api/data -o /dev/null -w "Size: %{size_download} bytes\n"
 * 
 * # 不带压缩头 (应该返回原始大小)
 * curl -H "Accept-Encoding: " http://localhost:3001/api/data -o /dev/null -w "Size: %{size_download} bytes\n"
 * 
 * # 查看响应头
 * curl -I -H "Accept-Encoding: gzip" http://localhost:3001/api/data
 * 
 * # 解压响应
 * curl -H "Accept-Encoding: gzip" http://localhost:3001/api/data | gunzip
 */

export {
  example1_basic,
  example2_customConfig,
  example3_presets,
  example4_jsonOnly,
  example5_customFilter,
  example6_aggressive,
  example7_production,
  example8_compressionStats,
  example9_withOtherMiddleware,
  example10_typescriptProject,
};
