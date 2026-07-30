import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function MonthSelector({ selectedMonth, setSelectedMonth }) {
  // selectedMonth is string 'YYYY-MM' e.g. '2026-07'
  const [yearStr, monthStr] = (selectedMonth || new Date().toISOString().slice(0, 7)).split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; // 0-indexed

  const dateObj = new Date(year, month, 1);
  const formattedMonthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    const prevDate = new Date(year, month - 1, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const nextDate = new Date(year, month + 1, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const handleDirectSelect = (e) => {
    const val = e.target.value;
    if (val) {
      setSelectedMonth(val);
    }
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid var(--border-color)',
      padding: '4px 10px',
      borderRadius: '12px'
    }}>
      <button 
        onClick={handlePrevMonth}
        title="Previous Month"
        style={{
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '4px',
          borderRadius: '6px'
        }}
      >
        <ChevronLeft size={18} />
      </button>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
        <Calendar size={15} color="#6366f1" />
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', minWidth: '110px', textAlign: 'center' }}>
          {formattedMonthLabel}
        </span>
        <input 
          type="month"
          value={selectedMonth}
          onChange={handleDirectSelect}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%'
          }}
        />
      </div>

      <button 
        onClick={handleNextMonth}
        title="Next Month"
        style={{
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '4px',
          borderRadius: '6px'
        }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
