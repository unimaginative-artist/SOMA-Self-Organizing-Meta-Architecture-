/**
 * Code Review Panel
 * 
 * Shows AI code review results inline as you type.
 * Displays security issues, performance warnings, and suggestions.
 */

import React, { useState, useEffect } from 'react';
import { codeReviewer, ReviewIssue, CodeReviewResult } from '../services/codeReviewer';

interface CodeReviewPanelProps {
  file: string;
  content: string;
  onRequestFix?: (issue: ReviewIssue) => void;
}

export const CodeReviewPanel: React.FC<CodeReviewPanelProps> = ({
  file,
  content,
  onRequestFix
}) => {
  const [review, setReview] = useState<CodeReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const performReview = async () => {
      if (!file || !content) return;

      setIsReviewing(true);

      try {
        const result = await codeReviewer.reviewCode(file, content);
        if (mounted) {
          setReview(result);
        }
      } catch (error) {
        console.error('[CodeReviewPanel] Review failed:', error);
        // Set empty review on error to prevent UI breaking
        if (mounted) {
          setReview({
            issues: [],
            score: 100,
            summary: 'Review unavailable',
            canCommit: true,
            blockers: [],
            warnings: [],
            suggestions: []
          });
        }
      } finally {
        if (mounted) {
          setIsReviewing(false);
        }
      }
    };

    // Debounce review
    const timeout = setTimeout(performReview, 1000);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [file, content]);

  if (!review && !isReviewing) {
    return null;
  }

  if (isReviewing) {
    return (
      <div className="p-3 bg-gray-900/50 border-t border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          Reviewing code...
        </div>
      </div>
    );
  }

  if (!review || review.issues.length === 0) {
    return (
      <div className="p-3 bg-gray-900/50 border-t border-gray-700">
        <div className="flex items-center gap-2 text-sm text-green-400">
          <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
            ✓
          </div>
          {review?.summary || 'No issues found'}
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: ReviewIssue['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'info': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'style': return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getSeverityIcon = (severity: ReviewIssue['severity']) => {
    switch (severity) {
      case 'critical': return '🚫';
      case 'warning': return '⚠️';
      case 'info': return '💡';
      case 'style': return '✨';
    }
  };

  const getCategoryBadge = (category: ReviewIssue['category']) => {
    const colors = {
      security: 'bg-red-500/20 text-red-300',
      performance: 'bg-orange-500/20 text-orange-300',
      'best-practice': 'bg-blue-500/20 text-blue-300',
      bug: 'bg-purple-500/20 text-purple-300',
      style: 'bg-gray-500/20 text-gray-300'
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs ${colors[category]}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="bg-gray-900/50 border-t border-gray-700 max-h-[300px] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-gray-300">
              Code Quality Score: {review.score}/100
            </div>
            {!review.canCommit && (
              <div className="text-xs text-red-400 px-2 py-1 bg-red-500/10 rounded">
                Cannot commit - fix critical issues first
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {review.issues.length} issue{review.issues.length > 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="divide-y divide-gray-800">
        {/* Blockers */}
        {review.blockers.length > 0 && (
          <div className="p-3">
            <div className="text-xs font-medium text-red-400 mb-2">
              🚫 Must Fix ({review.blockers.length})
            </div>
            {review.blockers.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                expanded={expandedIssue === issue.id}
                onToggle={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                onRequestFix={onRequestFix}
                getSeverityColor={getSeverityColor}
                getSeverityIcon={getSeverityIcon}
                getCategoryBadge={getCategoryBadge}
              />
            ))}
          </div>
        )}

        {/* Warnings */}
        {review.warnings.length > 0 && (
          <div className="p-3">
            <div className="text-xs font-medium text-yellow-400 mb-2">
              ⚠️ Warnings ({review.warnings.length})
            </div>
            {review.warnings.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                expanded={expandedIssue === issue.id}
                onToggle={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                onRequestFix={onRequestFix}
                getSeverityColor={getSeverityColor}
                getSeverityIcon={getSeverityIcon}
                getCategoryBadge={getCategoryBadge}
              />
            ))}
          </div>
        )}

        {/* Suggestions */}
        {review.suggestions.length > 0 && (
          <div className="p-3">
            <div className="text-xs font-medium text-blue-400 mb-2">
              💡 Suggestions ({review.suggestions.length})
            </div>
            {review.suggestions.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                expanded={expandedIssue === issue.id}
                onToggle={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                onRequestFix={onRequestFix}
                getSeverityColor={getSeverityColor}
                getSeverityIcon={getSeverityIcon}
                getCategoryBadge={getCategoryBadge}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface IssueCardProps {
  issue: ReviewIssue;
  expanded: boolean;
  onToggle: () => void;
  onRequestFix?: (issue: ReviewIssue) => void;
  getSeverityColor: (severity: ReviewIssue['severity']) => string;
  getSeverityIcon: (severity: ReviewIssue['severity']) => string;
  getCategoryBadge: (category: ReviewIssue['category']) => JSX.Element;
}

const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  expanded,
  onToggle,
  onRequestFix,
  getSeverityColor,
  getSeverityIcon,
  getCategoryBadge
}) => {
  return (
    <div
      className={`mb-2 last:mb-0 rounded border ${getSeverityColor(issue.severity)} transition-all`}
    >
      <button
        onClick={onToggle}
        className="w-full p-2 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span className="text-sm">{getSeverityIcon(issue.severity)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getCategoryBadge(issue.category)}
              {issue.line && (
                <span className="text-xs text-gray-500">
                  Line {issue.line}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-300">{issue.message}</div>
          </div>
          <div className="text-gray-500 text-xs">
            {expanded ? '▼' : '▶'}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-white/5 mt-1 pt-2">
          {issue.suggestion && (
            <div className="text-xs text-gray-400">
              <span className="font-medium">Suggestion:</span> {issue.suggestion}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Detected by {issue.arbiterSource}
            </div>
            {issue.autoFixAvailable && onRequestFix && (
              <button
                onClick={() => onRequestFix(issue)}
                className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors"
              >
                Auto-fix
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
