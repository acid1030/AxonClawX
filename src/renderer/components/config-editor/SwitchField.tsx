/**
 * 配置编辑器 - 开关
 */
import React from 'react';
import { ConfigField } from './ConfigField';
import { Switch } from '@/components/ui/switch';

interface SwitchFieldProps {
  label: string;
  desc?: string;
  tooltip?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export const SwitchField: React.FC<SwitchFieldProps> = ({
  label,
  desc,
  tooltip,
  value,
  onChange,
}) => (
  <ConfigField label={label} desc={desc} tooltip={tooltip}>
    <Switch checked={value} onCheckedChange={onChange} />
  </ConfigField>
);
