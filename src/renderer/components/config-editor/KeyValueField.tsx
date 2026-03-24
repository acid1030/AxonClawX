/**
 * 配置编辑器 - key-value 对编辑
 */
import React, { useState, useCallback } from 'react';
import { ConfigField } from './ConfigField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface KeyValueFieldProps {
  label: string;
  desc?: string;
  tooltip?: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export const KeyValueField: React.FC<KeyValueFieldProps> = ({
  label,
  desc,
  tooltip,
  value,
  onChange,
  keyPlaceholder = 'key',
  valuePlaceholder = 'value',
}) => {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const entries = Object.entries(value || {});

  const add = useCallback(() => {
    const k = newKey.trim();
    if (k) {
      onChange({ ...(value || {}), [k]: newVal });
      setNewKey('');
      setNewVal('');
    }
  }, [newKey, newVal, value, onChange]);

  return (
    <ConfigField label={label} desc={desc} tooltip={tooltip} inline={false}>
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded min-w-[60px]">
                {k}
              </span>
              <Input
                type="text"
                value={v}
                onChange={(e) => onChange({ ...value, [k]: e.target.value })}
                className="flex-1 h-8 font-mono text-sm"
              />
              <button
                onClick={() => {
                  const next = { ...value };
                  delete next[k];
                  onChange(next);
                }}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-1.5 mt-1">
        <Input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder={keyPlaceholder}
          className="w-full sm:w-32 h-8 font-mono text-sm"
        />
        <Input
          type="text"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={valuePlaceholder}
          className="flex-1 h-8 font-mono text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-8 px-2.5">
          +
        </Button>
      </div>
    </ConfigField>
  );
};
