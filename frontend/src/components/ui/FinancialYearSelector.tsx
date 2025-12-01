import { Select } from './Select';

interface FinancialYearSelectorProps {
  value: string;
  onChange: (fy: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  yearsBack?: number; // How many past years to show
}

// Utility function to get current financial year (April to March)
function getCurrentFinancialYear(): string {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();

  // If month is Jan-Mar, FY started in previous year
  // If month is Apr-Dec, FY started in current year
  const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
  const fyEndYear = fyStartYear + 1;

  return `${fyStartYear}-${fyEndYear.toString().slice(-2)}`;
}

// Generate list of financial years
function generateFinancialYears(yearsBack: number = 5): string[] {
  const currentFY = getCurrentFinancialYear();
  const currentStartYear = parseInt(currentFY.split('-')[0]);

  const years: string[] = [];
  for (let i = 0; i <= yearsBack; i++) {
    const startYear = currentStartYear - i;
    const endYear = startYear + 1;
    years.push(`${startYear}-${endYear.toString().slice(-2)}`);
  }

  return years;
}

export function FinancialYearSelector({
  value,
  onChange,
  label = 'Financial Year',
  required = false,
  disabled = false,
  error,
  className,
  yearsBack = 5,
}: FinancialYearSelectorProps) {
  const financialYears = generateFinancialYears(yearsBack);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <Select
      label={label}
      value={value}
      onChange={handleChange}
      required={required}
      disabled={disabled}
      error={error}
      className={className}
    >
      <option value="">All Years</option>
      {financialYears.map((fy) => (
        <option key={fy} value={fy}>
          FY {fy}
        </option>
      ))}
    </Select>
  );
}

// Export utility functions for use in other components
export { getCurrentFinancialYear, generateFinancialYears };
