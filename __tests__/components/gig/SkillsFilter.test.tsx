import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SkillsFilter } from '@/components/gig/SkillsFilter'

describe('SkillsFilter', () => {
  const mockOnSkillsChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render skills filter with default popular skills', () => {
    render(
      <SkillsFilter selectedSkills={[]} onSkillsChange={mockOnSkillsChange} />
    )

    expect(screen.getByText('Skills')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('JavaScript')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('should display only 8 skills initially', () => {
    render(
      <SkillsFilter selectedSkills={[]} onSkillsChange={mockOnSkillsChange} />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBe(8)
  })

  it('should show "Show All" button when more than 8 skills', () => {
    render(
      <SkillsFilter selectedSkills={[]} onSkillsChange={mockOnSkillsChange} />
    )

    expect(screen.getByText(/Show All/)).toBeInTheDocument()
  })

  it('should expand to show all skills when "Show All" is clicked', () => {
    render(
      <SkillsFilter selectedSkills={[]} onSkillsChange={mockOnSkillsChange} />
    )

    const showAllButton = screen.getByText(/Show All/)
    fireEvent.click(showAllButton)

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(8)
    expect(screen.getByText('Show Less')).toBeInTheDocument()
  })

  it('should call onSkillsChange when skill is selected', () => {
    render(
      <SkillsFilter selectedSkills={[]} onSkillsChange={mockOnSkillsChange} />
    )

    const reactCheckbox = screen.getByLabelText('React')
    fireEvent.click(reactCheckbox)

    expect(mockOnSkillsChange).toHaveBeenCalledWith(['React'])
  })

  it('should call onSkillsChange when skill is deselected', () => {
    render(
      <SkillsFilter
        selectedSkills={['React', 'JavaScript']}
        onSkillsChange={mockOnSkillsChange}
      />
    )

    const reactCheckbox = screen.getByLabelText('React')
    fireEvent.click(reactCheckbox)

    expect(mockOnSkillsChange).toHaveBeenCalledWith(['JavaScript'])
  })

  it('should show checked state for selected skills', () => {
    render(
      <SkillsFilter
        selectedSkills={['React', 'TypeScript']}
        onSkillsChange={mockOnSkillsChange}
      />
    )

    const reactCheckbox = screen.getByLabelText('React') as HTMLInputElement
    const typescriptCheckbox = screen.getByLabelText(
      'TypeScript'
    ) as HTMLInputElement
    const javascriptCheckbox = screen.getByLabelText(
      'JavaScript'
    ) as HTMLInputElement

    expect(reactCheckbox.checked).toBe(true)
    expect(typescriptCheckbox.checked).toBe(true)
    expect(javascriptCheckbox.checked).toBe(false)
  })

  it('should handle multiple skill selections', () => {
    const { rerender } = render(
      <SkillsFilter selectedSkills={[]} onSkillsChange={mockOnSkillsChange} />
    )

    const reactCheckbox = screen.getByLabelText('React')
    fireEvent.click(reactCheckbox)
    expect(mockOnSkillsChange).toHaveBeenCalledWith(['React'])

    rerender(
      <SkillsFilter
        selectedSkills={['React']}
        onSkillsChange={mockOnSkillsChange}
      />
    )

    const javascriptCheckbox = screen.getByLabelText('JavaScript')
    fireEvent.click(javascriptCheckbox)
    expect(mockOnSkillsChange).toHaveBeenCalledWith(['React', 'JavaScript'])
  })

  it('should accept custom popular skills', () => {
    const customSkills = ['Skill A', 'Skill B', 'Skill C']

    render(
      <SkillsFilter
        selectedSkills={[]}
        onSkillsChange={mockOnSkillsChange}
        popularSkills={customSkills}
      />
    )

    expect(screen.getByText('Skill A')).toBeInTheDocument()
    expect(screen.getByText('Skill B')).toBeInTheDocument()
    expect(screen.getByText('Skill C')).toBeInTheDocument()
  })

  it('should not show "Show All" button when 8 or fewer skills', () => {
    const fewSkills = ['Skill A', 'Skill B', 'Skill C']

    render(
      <SkillsFilter
        selectedSkills={[]}
        onSkillsChange={mockOnSkillsChange}
        popularSkills={fewSkills}
      />
    )

    expect(screen.queryByText(/Show All/)).not.toBeInTheDocument()
  })

  it('should toggle between "Show All" and "Show Less"', () => {
    render(
      <SkillsFilter selectedSkills={[]} onSkillsChange={mockOnSkillsChange} />
    )

    const showAllButton = screen.getByText(/Show All/)
    fireEvent.click(showAllButton)

    expect(screen.getByText('Show Less')).toBeInTheDocument()

    const showLessButton = screen.getByText('Show Less')
    fireEvent.click(showLessButton)

    expect(screen.getByText(/Show All/)).toBeInTheDocument()
  })
})
