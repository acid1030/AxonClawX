export type ResourceLibraryCategoryId = 'imagePrompts' | 'cameraPrompts' | 'capcutTips';

export interface ResourceLibraryItem {
  id: string;
  title: string;
  description: string;
  prompt?: string;
  imageUrl?: string;
  imageAlt?: string;
  tags: string[];
  level?: 'basic' | 'pro';
}

export interface ResourceLibraryCategory {
  id: ResourceLibraryCategoryId;
  titleKey: string;
  fallbackTitle: string;
  descriptionKey: string;
  fallbackDescription: string;
  accent: 'cyan' | 'orange' | 'emerald';
  items: ResourceLibraryItem[];
}

export interface ResourceLibraryPayload {
  version: string;
  updatedAt: string;
  categories: ResourceLibraryCategory[];
}

export const BUILTIN_RESOURCE_LIBRARY: ResourceLibraryPayload = {
  version: '2026.05.09-local',
  updatedAt: '2026-05-09',
  categories: [
    {
      id: 'imagePrompts',
      titleKey: 'resourceLibrary.categories.imagePrompts.title',
      fallbackTitle: '图片提示词',
      descriptionKey: 'resourceLibrary.categories.imagePrompts.description',
      fallbackDescription: '适合文生图、图生图、商品图和海报设计的可复制提示词。',
      accent: 'cyan',
      items: [
        {
          id: 'image-product-hero',
          title: '高端产品主视觉',
          description: '用于电商首图、品牌海报和新品发布视觉。',
          prompt: '高端商业产品摄影，主体居中，柔和轮廓光，深色渐变背景，微反射台面，细节清晰，电影级布光，8k，clean composition, premium product photography',
          tags: ['产品图', '电商', '主视觉'],
          level: 'basic',
        },
        {
          id: 'image-character-editorial',
          title: '人物杂志大片',
          description: '适合真人角色、虚拟人和品牌代言人视觉。',
          prompt: 'editorial portrait, confident subject, dramatic key light, subtle rim light, textured background, fashion magazine style, sharp eyes, cinematic color grading, high detail',
          tags: ['人物', '杂志', '写真'],
          level: 'pro',
        },
        {
          id: 'image-scene-cyber-city',
          title: '未来城市氛围图',
          description: '用于科幻内容、视频封面和世界观视觉。',
          prompt: 'futuristic city at night, neon reflections, rainy street, volumetric fog, layered skyline, cinematic wide angle, detailed architecture, blue orange contrast, immersive atmosphere',
          tags: ['场景', '科幻', '封面'],
          level: 'basic',
        },
        {
          id: 'image-food-commercial',
          title: '美食商业摄影',
          description: '适合餐饮菜单、短视频封面和店铺宣传。',
          prompt: 'commercial food photography, fresh ingredients, warm natural light, shallow depth of field, appetizing texture, clean plate styling, steam detail, high-end restaurant menu style',
          tags: ['美食', '商业摄影', '餐饮'],
          level: 'basic',
        },
      ],
    },
    {
      id: 'cameraPrompts',
      titleKey: 'resourceLibrary.categories.cameraPrompts.title',
      fallbackTitle: '运镜提示词',
      descriptionKey: 'resourceLibrary.categories.cameraPrompts.description',
      fallbackDescription: '适合视频生成、分镜设计、镜头运动和短片节奏控制。',
      accent: 'orange',
      items: [
        {
          id: 'camera-slow-push-in',
          title: '慢速推进镜头',
          description: '从环境过渡到主体，适合情绪铺垫和产品亮相。',
          prompt: 'slow cinematic push-in, camera moves steadily toward the subject, shallow depth of field, smooth stabilized motion, subtle parallax, dramatic reveal',
          tags: ['推进', '氛围', '揭示'],
          level: 'basic',
        },
        {
          id: 'camera-orbit-reveal',
          title: '环绕揭示镜头',
          description: '围绕主体旋转，突出空间、结构和高级感。',
          prompt: 'smooth 180-degree orbit shot around the subject, controlled speed, background parallax, subject remains centered, cinematic lighting, premium reveal',
          tags: ['环绕', '产品', '空间'],
          level: 'pro',
        },
        {
          id: 'camera-handheld-documentary',
          title: '纪录片手持感',
          description: '适合真实感、街头、探店和人物故事。',
          prompt: 'subtle handheld documentary camera, natural micro-shake, realistic focus breathing, ambient light, observational movement, authentic real-world texture',
          tags: ['纪录片', '真实感', '街头'],
          level: 'basic',
        },
        {
          id: 'camera-match-cut',
          title: '匹配剪辑转场',
          description: '通过形状或动作匹配完成丝滑转场。',
          prompt: 'match cut transition, subject motion aligns between scenes, seamless timing, same screen position, clean visual continuity, rhythmic edit',
          tags: ['转场', '剪辑', '节奏'],
          level: 'pro',
        },
      ],
    },
    {
      id: 'capcutTips',
      titleKey: 'resourceLibrary.categories.capcutTips.title',
      fallbackTitle: '剪映技巧',
      descriptionKey: 'resourceLibrary.categories.capcutTips.description',
      fallbackDescription: '面向剪映成片流程的字幕、节奏、调色、封面和模板技巧。',
      accent: 'emerald',
      items: [
        {
          id: 'capcut-hook-first-3s',
          title: '前三秒钩子',
          description: '开头先给结果、冲突或强利益点，再补充过程。',
          prompt: '剪辑结构：0-3 秒展示最终效果或最大反差；3-8 秒说明问题；8 秒后进入步骤拆解。字幕使用短句，每屏不超过 14 个字。',
          tags: ['开头', '留存', '短视频'],
          level: 'basic',
        },
        {
          id: 'capcut-beat-cut',
          title: '卡点剪辑',
          description: '让画面切换、缩放和字幕出现跟随音乐节拍。',
          prompt: '在剪映中打开音频波形，按重拍添加分割点；每个重拍切换一个画面动作，轻拍用于字幕弹入或局部放大。',
          tags: ['卡点', '节奏', '音乐'],
          level: 'basic',
        },
        {
          id: 'capcut-color-grade',
          title: '统一调色',
          description: '用调整层统一色温、对比和质感，避免素材拼接感。',
          prompt: '先校正曝光，再统一色温；轻微增加对比和锐化，降低高光溢出；同一系列视频保存为剪映调色预设。',
          tags: ['调色', '质感', '统一'],
          level: 'pro',
        },
        {
          id: 'capcut-caption-style',
          title: '字幕层级',
          description: '主字幕负责信息，强调词负责视觉锚点。',
          prompt: '主字幕使用高对比白字；关键词用品牌色描边或色块；每 2-3 秒改变一次字幕位置或强调词，避免视觉疲劳。',
          tags: ['字幕', '排版', '信息层级'],
          level: 'basic',
        },
      ],
    },
  ],
};
