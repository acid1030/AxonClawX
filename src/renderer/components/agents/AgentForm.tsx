import { useState } from 'react';
import { useAgentsStore, Agent } from '@/stores/agentsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';

const PRESET_ROLES = [
  { value: 'strategist', label: 'Strategy Lead (NEXUS)' },
  { value: 'product', label: 'Product Architect (ARIA)' },
  { value: 'engineering', label: 'Engineering Lead (KAEL)' },
  { value: 'fullstack', label: 'Full-Stack Dev (ZARA)' },
  { value: 'backend', label: 'Backend Architect (DANTE)' },
  { value: 'designer', label: 'Interaction Designer (LUNA)' },
  { value: 'devops', label: 'DevOps Lead (ATLAS)' },
  { value: 'qa', label: 'QA Gatekeeper (REX)' },
  { value: 'security', label: 'Security Architect (CIPHER)' },
  { value: 'analyst', label: 'Data Analyst (ECHO)' },
  { value: 'writer', label: 'Documentation Specialist (SCRIBE)' },
  { value: 'content', label: 'Content Strategist (MUSE)' },
  { value: 'growth', label: 'Growth Engine (NOVA)' },
  { value: 'custom', label: 'Custom Role' },
];

interface AgentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent | null;
}

export function AgentForm({ open, onOpenChange, agent }: AgentFormProps) {
  const { addAgent, updateAgent } = useAgentsStore();
  const [formData, setFormData] = useState({
    name: agent?.name || '',
    role: agent?.role || 'fullstack',
    specialty: agent?.specialty || '',
    soul: agent?.soul || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!agent;

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    setIsSubmitting(true);

    try {
      if (isEditing && agent) {
        updateAgent(agent.id, formData);
      } else {
        const newAgent: Agent = {
          id: uuidv4(),
          ...formData,
          status: 'idle',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addAgent(newAgent);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (role: string) => {
    const preset = PRESET_ROLES.find((r) => r.value === role);
    setFormData((prev) => ({
      ...prev,
      role,
      name: prev.name || preset?.label.split(' ')[0] || '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Agent' : 'Create Agent'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this agent's configuration and persona'
              : 'Add a new agent to your team'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Give this agent a name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Input
              id="specialty"
              placeholder="e.g. frontend, API design, user research"
              value={formData.specialty}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  specialty: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="soul">Persona (SOUL.md)</Label>
            <Textarea
              id="soul"
              placeholder="Describe this agent's personality and working style..."
              value={formData.soul}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, soul: e.target.value }))
              }
              className="min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
