/**
 * 配置编辑器 - 下拉Select
 */
import React from 'react';
import { ConfigField } from './ConfigField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SelectFieldProps {
  label: string;
  desc?: string;
  tooltip?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  allowEmpty?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  desc,
  tooltip,
  value,
  onChange,
  options,
  error,
  allowEmpty,
}) => {
  const EMPTY_SENTINEL = '__empty__';
  const allOptions = allowEmpty ? [{ value: EMPTY_SENTINEL, label: '—' }, ...options] : options;
  const displayValue = allowEmpty && (value ?? '') === '' ? EMPTY_SENTINEL : (value ?? '');
  const handleValueChange = (next: string) => {
    if (allowEmpty && next === EMPTY_SENTINEL) {
      onChange('');
      return;
    }
    onChange(next);
  };

  return (
    <ConfigField label={label} desc={desc} tooltip={tooltip} error={error}>
      <Select value={displayValue} onValueChange={handleValueChange}>
        <SelectTrigger className="h-8 w-full md:w-64 font-mono text-sm">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {allOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ConfigField>
  );
};
