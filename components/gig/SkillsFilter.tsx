'use client'

import React, { useState } from 'react'

interface SkillsFilterProps {
  selectedSkills: string[]
  onSkillsChange: (skills: string[]) => void
  popularSkills?: string[]
}

const DEFAULT_POPULAR_SKILLS = [
  'React',
  'JavaScript',
  'TypeScript',
  'Node.js',
  'Python',
  'Design',
  'Marketing',
  'Writing',
  'Construction',
  'Cleaning',
  'Transportation',
  'Photography',
  'Video Editing',
  'Data Entry',
  'Customer Service'
]

export function SkillsFilter({
  selectedSkills,
  onSkillsChange,
  popularSkills = DEFAULT_POPULAR_SKILLS
}: SkillsFilterProps) {
  const [showAll, setShowAll] = useState(false)
  const displayedSkills = showAll ? popularSkills : popularSkills.slice(0, 8)

  const handleSkillToggle = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      onSkillsChange(selectedSkills.filter((s) => s !== skill))
    } else {
      onSkillsChange([...selectedSkills, skill])
    }
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Skills</h4>
      <div className="space-y-2 mb-3">
        {displayedSkills.map((skill) => (
          <label
            key={skill}
            className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedSkills.includes(skill)}
              onChange={() => handleSkillToggle(skill)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">{skill}</span>
          </label>
        ))}
      </div>
      {popularSkills.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {showAll ? 'Show Less' : `Show All (${popularSkills.length})`}
        </button>
      )}
    </div>
  )
}
