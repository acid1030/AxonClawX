/**
 * 配置编辑器 - 字符串数组编辑
 */
import React, { useState, useCallback } from 'react';
import { ConfigField } from './ConfigField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ArrayFieldProps {
  label: string;
  desc?: string;
  tooltip?: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}

export const ArrayField: React.FC<ArrayFieldProps> = ({
  label,
  desc,
  tooltip,
  value,
  onChange,
  placeholder = 'Type and press Enter to add',
}) => {
  const [input, setInput] = useState('');
  const items = Array.isArray(value) ? value : [];

  const add = useCallback(() => {
    const v = input.trim();
    if (v && !items.includes(v)) {
      onChange([...items, v]);
      setInput('');
    }
  }, [input, items, onChange]);

  return (
    <ConfigField label={label} desc={desc} tooltip={tooltip} inline>
      <div className="flex flex-col gap-1.5">
        {items.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {items.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[11px] rounded-md font-mono"
              >
                {item}
                <button
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            className="flex-1 h-8 font-mono text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={add} className="h-8 px-2.5">
            +
          </Button>
        </div>
      </div>
    </ConfigField>
  );
};
