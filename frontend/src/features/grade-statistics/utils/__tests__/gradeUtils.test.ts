import { scoreToGPA, scoreToGrade, calculateCourseGPA, calculateTotalGPA } from '../gradeUtils';

describe('GPA Calculation Utilities', () => {
  describe('scoreToGPA', () => {
    it('should convert scores to correct GPA values', () => {
      expect(scoreToGPA(95)).toBe(4.0);
      expect(scoreToGPA(90)).toBe(3.67);
      expect(scoreToGPA(85)).toBe(3.33);
      expect(scoreToGPA(80)).toBe(3.0);
      expect(scoreToGPA(75)).toBe(2.67);
      expect(scoreToGPA(70)).toBe(2.33);
      expect(scoreToGPA(65)).toBe(2.0);
      expect(scoreToGPA(60)).toBe(1.67);
      expect(scoreToGPA(55)).toBe(1.33);
      expect(scoreToGPA(50)).toBe(1.0);
      expect(scoreToGPA(45)).toBe(0.0);
    });
  });

  describe('scoreToGrade', () => {
    it('should convert scores to correct letter grades', () => {
      expect(scoreToGrade(95)).toBe('A');
      expect(scoreToGrade(90)).toBe('A-');
      expect(scoreToGrade(85)).toBe('B+');
      expect(scoreToGrade(80)).toBe('B');
      expect(scoreToGrade(75)).toBe('B-');
      expect(scoreToGrade(70)).toBe('C+');
      expect(scoreToGrade(65)).toBe('C');
      expect(scoreToGrade(60)).toBe('C-');
      expect(scoreToGrade(55)).toBe('D+');
      expect(scoreToGrade(50)).toBe('D');
      expect(scoreToGrade(45)).toBe('F');
    });
  });

  describe('calculateCourseScore', () => {
    it('should calculate the total weighted score contribution', () => {
      const items = [
        { total_weight_pct: 30, obtained_score_pct: 85 }, // contribution 25.5
        { total_weight_pct: 40, obtained_score_pct: 90 }, // contribution 36
        { total_weight_pct: 30, obtained_score_pct: 80 }, // contribution 24
      ];
      // Expected score = 25.5 + 36 + 24 = 85.5
      const score = calculateCourseScore(items);
      expect(score).toBeCloseTo(85.5);
    });
  });

  describe('calculateCourseGPA', () => {
    it('should calculate GPA based on total contribution to course score', () => {
      const items = [
        { total_weight_pct: 30, obtained_score_pct: 85 }, // contribution 25.5
        { total_weight_pct: 40, obtained_score_pct: 90 }, // contribution 36
      ];
      
      // Total score = 25.5 + 36 = 61.5
      // GPA for 61.5 is 1.67 (C-)
      const gpa = calculateCourseGPA(items);
      expect(gpa).toBeCloseTo(1.67, 2);
    });

    it('should calculate correctly when weights sum to 100', () => {
      const items = [
        { total_weight_pct: 30, obtained_score_pct: 85 },
        { total_weight_pct: 40, obtained_score_pct: 90 },
        { total_weight_pct: 30, obtained_score_pct: 80 },
      ];
      // Total score = 25.5 + 36 + 24 = 85.5
      // GPA for 85.5 is 3.33 (B+)
      const gpa = calculateCourseGPA(items);
      expect(gpa).toBeCloseTo(3.33, 2);
    });

    it('should handle empty items array', () => {
      expect(calculateCourseGPA([])).toBe(0);
    });

    it('should handle items with zero weight', () => {
      const items = [
        { total_weight_pct: 0, obtained_score_pct: 85 },
        { total_weight_pct: 100, obtained_score_pct: 90 },
      ];
      
      expect(calculateCourseGPA(items)).toBe(3.67);
    });
  });

  describe('calculateTotalGPA', () => {
    it('should calculate total GPA across multiple courses', () => {
      const courses = [
        {
          course: { credits: 3 },
          items: [
            { total_weight_pct: 100, obtained_score_pct: 85 } // B+ = 3.33
          ]
        },
        {
          course: { credits: 4 },
          items: [
            { total_weight_pct: 100, obtained_score_pct: 90 } // A- = 3.67
          ]
        }
      ];
      
      // Expected: (3.33 * 3 + 3.67 * 4) / 7 = 3.52
      const totalGPA = calculateTotalGPA(courses);
      expect(totalGPA).toBeCloseTo(3.52, 2);
    });

    it('should handle empty courses array', () => {
      expect(calculateTotalGPA([])).toBe(0);
    });

    it('should handle courses with zero credits', () => {
      const courses = [
        {
          course: { credits: 0 },
          items: [{ total_weight_pct: 100, obtained_score_pct: 85 }]
        }
      ];
      
      expect(calculateTotalGPA(courses)).toBe(0);
    });
  });
});
