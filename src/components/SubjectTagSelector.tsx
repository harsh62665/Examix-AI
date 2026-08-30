import React, { useState, useRef, useEffect } from 'react';
import { Tag, Plus, Check, X, Atom, FunctionSquare, FlaskConical, Dna, Layers } from 'lucide-react';

export interface SubjectTagConfig {
  id: string;
  name: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  activeFilterBg: string;
  activeFilterText: string;
  activeFilterBorder: string;
  iconName?: string;
}

export const PRESET_SUBJECTS: SubjectTagConfig[] = [
  {
    id: 'Physics',
    name: 'Physics',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30 hover:border-emerald-400',
    activeFilterBg: 'bg-emerald-500',
    activeFilterText: 'text-black',
    activeFilterBorder: 'border-emerald-400',
    iconName: 'Atom'
  },
  {
    id: 'Calculus',
    name: 'Calculus',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/30 hover:border-purple-400',
    activeFilterBg: 'bg-purple-500',
    activeFilterText: 'text-white',
    activeFilterBorder: 'border-purple-400',
    iconName: 'FunctionSquare'
  },
  {
    id: 'Chemistry',
    name: 'Chemistry',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/30 hover:border-amber-400',
    activeFilterBg: 'bg-amber-500',
    activeFilterText: 'text-black',
    activeFilterBorder: 'border-amber-400',
    iconName: 'FlaskConical'
  },
  {
    id: 'Biology',
    name: 'Biology',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/30 hover:border-rose-400',
    activeFilterBg: 'bg-rose-500',
    activeFilterText: 'text-white',
    activeFilterBorder: 'border-rose-400',
    iconName: 'Dna'
  },
  {
    id: 'Misc',
    name: 'Misc',
    badgeBg: 'bg-slate-500/15',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-500/30 hover:border-slate-400',
    activeFilterBg: 'bg-slate-400',
    activeFilterText: 'text-black',
    activeFilterBorder: 'border-slate-300',
    iconName: 'Layers'
  }
];

export function getSubjectTagStyle(tag: string | undefined): SubjectTagConfig {
  if (!tag) return PRESET_SUBJECTS[4]; // Misc
  const matched = PRESET_SUBJECTS.find((p) => p.id.toLowerCase() === tag.trim().toLowerCase());
  if (matched) return matched;

  // Dynamic style for custom user-created tags
  return {
    id: tag,
    name: tag,
    badgeBg: 'bg-teal-500/15',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-500/30 hover:border-teal-400',
    activeFilterBg: 'bg-teal-500',
    activeFilterText: 'text-black',
    activeFilterBorder: 'border-teal-400',
    iconName: 'Tag'
  };
}

export function detectSubjectTag(text: string): string {
  const t = text.toLowerCase();
  if (
    /physics|velocity|acceleration|gravity|thermodynamic|optics|electric\s*field|magnetic|joule|friction|momentum|quantum|wave|circuit|resistor|capacit|current|voltage|projectile|kinemat|newton|coulomb|faraday|lorentz|schrodinger|planck|einstein/i.test(
      t
    )
  ) {
    return 'Physics';
  }
  if (
    /calculus|derivative|integral|integrat|differentiat|limit|slope|tangent|maxima|minima|differential\s*eq|continuity|taylor|series|trigonomet|matrix|matrices|vector|algebra|laplace|fourier|eigen/i.test(
      t
    )
  ) {
    return 'Calculus';
  }
  if (
    /chemist|reaction|mole|acid|base|ph\b|oxidation|reduction|periodic|organic|inorganic|stoichiometr|equilibrium|bonding|covalent|ionic|polymer|enthalpy|atom|molecule|titration|solubility/i.test(
      t
    )
  ) {
    return 'Chemistry';
  }
  if (
    /biolog|cell|dna|rna|genetics|photosynthes|mitosis|meiosis|ecology|organism|organ|tissue|chromosome|evolution|enzyme|respiration|botany|zoology|allele|protein\s*synthesis/i.test(
      t
    )
  ) {
    return 'Biology';
  }
  return 'Misc';
}

export function renderSubjectIcon(iconName?: string, className: string = 'w-3 h-3') {
  switch (iconName) {
    case 'Atom':
      return <Atom className={className} />;
    case 'FunctionSquare':
      return <FunctionSquare className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'Dna':
      return <Dna className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    default:
      return <Tag className={className} />;
  }
}

interface TagPickerDropdownProps {
  currentTag?: string;
  onSelectTag: (tag: string) => void;
  onClose: () => void;
  customTags?: string[];
}

export const TagPickerDropdown: React.FC<TagPickerDropdownProps> = ({
  currentTag,
  onSelectTag,
  onClose,
  customTags = []
}) => {
  const [newCustomTag, setNewCustomTag] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomTag.trim()) {
      onSelectTag(newCustomTag.trim());
      setNewCustomTag('');
      setIsAddingCustom(false);
    }
  };

  // Combine preset subject tags and unique user custom tags
  const allCustom = customTags.filter(
    (t) => !PRESET_SUBJECTS.some((p) => p.id.toLowerCase() === t.toLowerCase())
  );

  return (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-white/15 bg-[#18181B] p-2 text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
        <span>Assign Subject Tag</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
          <X size={12} />
        </button>
      </div>

      <div className="mt-1 space-y-1">
        {PRESET_SUBJECTS.map((preset) => {
          const isSelected = (currentTag || 'Misc').toLowerCase() === preset.id.toLowerCase();
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectTag(preset.id)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? `${preset.badgeBg} ${preset.badgeText} font-semibold border ${preset.badgeBorder}`
                  : 'text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                {renderSubjectIcon(preset.iconName, 'w-3.5 h-3.5 shrink-0')}
                <span>{preset.name}</span>
              </div>
              {isSelected && <Check size={13} className="shrink-0 text-white" />}
            </button>
          );
        })}

        {allCustom.map((custom) => {
          const isSelected = currentTag?.toLowerCase() === custom.toLowerCase();
          return (
            <button
              key={custom}
              type="button"
              onClick={() => onSelectTag(custom)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/40'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Tag size={13} className="text-teal-400 shrink-0" />
                <span className="truncate">{custom}</span>
              </div>
              {isSelected && <Check size={13} className="shrink-0 text-white" />}
            </button>
          );
        })}
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        {isAddingCustom ? (
          <form onSubmit={handleAddCustom} className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={newCustomTag}
              onChange={(e) => setNewCustomTag(e.target.value)}
              placeholder="e.g., Organic Chem"
              className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs text-white placeholder-gray-500 outline-none focus:border-[#4ADE80]"
            />
            <button
              type="submit"
              disabled={!newCustomTag.trim()}
              className="rounded-lg bg-[#4ADE80] px-2 py-1 text-xs font-bold text-black hover:bg-emerald-300 disabled:opacity-50 cursor-pointer"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsAddingCustom(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg py-1 text-[11px] font-semibold text-gray-400 hover:bg-white/5 hover:text-[#4ADE80] transition-colors"
          >
            <Plus size={12} />
            <span>Create Custom Tag</span>
          </button>
        )}
      </div>
    </div>
  );
};
