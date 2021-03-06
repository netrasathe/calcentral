'use strict';

var _ = require('lodash');

angular.module('calcentral.services').service('tasksService', function(apiService) {
  var taskSectionsGroupOne = [
    {
      type: 'campusSolutions',
      id: 'admission',
      title: 'Admission Tasks',
      show: false
    },
    {
      type: 'campusSolutions',
      id: 'residency',
      title: 'Residency Tasks',
      show: false
    }
  ];

  var taskSectionsGroupTwo = [
    {
      type: 'campusSolutions',
      id: 'newStudent',
      title: 'New Student Tasks',
      show: false
    },
    {
      type: 'campusSolutions',
      id: 'student',
      title: 'Student Tasks',
      show: false
    },
    {
      type: 'google',
      id: 'google',
      title: 'bTasks',
      show: false
    },
    {
      type: 'canvas',
      id: 'canvas',
      title: 'bCourses Tasks',
      show: false
    }
  ];

  var csCategoryFilterFactory = function(categoryString) {
    return function(task) {
      var category = categoryString;
      return (task.emitter === 'Campus Solutions' && task.cs.displayCategory === category);
    };
  };

  var csFinaidFilterFactory = function(taskSection) {
    return function(task) {
      var category = taskSection.id;
      var taskSectionFinaidYearId = taskSection.aidYearId;
      return (task.emitter === 'Campus Solutions' && task.cs.displayCategory === category && task.cs.finaidYearId === taskSectionFinaidYearId);
    };
  };

  var getFinAidTaskSections = function(scope) {
    var csFinAidTasks = _.filter(scope.tasks, isCsFinAidTask);
    var csFinAidYearIds = _.map(csFinAidTasks, function(task) {
      return _.get(task, 'cs.finaidYearId');
    });
    var uniqueCsFinAidYearIds = _.uniq(csFinAidYearIds);
    var csFinAidTaskSections = _.map(uniqueCsFinAidYearIds, function(aidYearId) {
      var previousYear = _.toInteger(aidYearId) - 1;
      var yearRange = previousYear + '-' + aidYearId;
      return {
        type: 'campusSolutions',
        id: 'finaid',
        aidYearId: aidYearId,
        yearRange: yearRange,
        title: 'Financial Aid Tasks',
        show: false
      };
    });
    return csFinAidTaskSections;
  };

  var isCanvasTask = function(task) {
    return (task.emitter === 'bCourses');
  };

  var isCompletedTask = function(task) {
    return (task.status === 'completed');
  };

  var isCsBeingProcessedTask = function(task) {
    return (task.emitter === 'Campus Solutions' && task.cs.displayStatus === 'beingProcessed');
  };

  var isCsFinAidTask = function(task) {
    return (task.emitter === 'Campus Solutions' && task.cs && task.cs.displayCategory === 'finaid');
  };

  var isCsFurtherActionNeededTask = function(task) {
    return (task.emitter === 'Campus Solutions' && task.cs.displayStatus === 'furtherActionNeeded');
  };

  var isDueWithinOneWeekTask = function(task) {
    return (task.dueDate && task.dueDate.withinOneWeek);
  };

  var isGoogleTask = function(task) {
    return (task.emitter === 'Google');
  };

  var isIncompleteTask = function(task) {
    return (task.status !== 'completed');
  };

  var isOverdueTask = function(task) {
    return (task.bucket === 'Overdue' && isIncompleteTask(task) && !isCsBeingProcessedTask(task));
  };

  var sortByCompletedDateReverse = function(a, b) {
    return sortByDate(a, b, 'completedDate', true);
  };

  var sortByDate = function(a, b, date, reverse) {
    if (a[date] && b[date] && a[date].epoch !== b[date].epoch) {
      if (!reverse) {
        return a[date].epoch - b[date].epoch;
      } else {
        return b[date].epoch - a[date].epoch;
      }
    } else {
      return sortByTitle(a, b);
    }
  };

  var sortByDueDate = function(a, b) {
    return sortByDate(a, b, 'dueDate', false);
  };

  var sortByUpdatedDate = function(a, b) {
    return sortByDate(a, b, 'updatedDate', false);
  };

  var sortByTitle = function(a, b) {
    return apiService.util.naturalSort(a.title, b.title);
  };

  var updateTaskLists = function($scope) {
    var incompleteTasks = _.clone($scope.tasks.filter(isIncompleteTask));
    var overdueTasks = [];

    // separate overdue tasks
    if (incompleteTasks.length > 0) {
      overdueTasks = _.remove(incompleteTasks, isOverdueTask);
    }

    $scope.lists = {
      completed: $scope.tasks.filter(isCompletedTask),
      incomplete: incompleteTasks,
      overdue: overdueTasks.sort(sortByDueDate)
    };

    // populate task sections
    var finaidTaskSections = getFinAidTaskSections($scope);
    $scope.taskSections = _.flatten(_.concat(taskSectionsGroupOne, [finaidTaskSections, taskSectionsGroupTwo]));
    angular.forEach($scope.taskSections, function(taskSection) {
      var taskFilter;
      var incompleteSortingMethod;
      var incompleteSectionTasks = [];
      var furtherActionNeededTasks = [];
      var beingProcessedTasks = [];
      var incompleteSortedSectionTasks = [];

      switch (taskSection.type) {
        case 'campusSolutions': {
          if (taskSection.id === 'finaid') {
            taskFilter = csFinaidFilterFactory(taskSection);
          } else {
            taskFilter = csCategoryFilterFactory(taskSection.id);
          }
          break;
        }
        case 'google': {
          taskFilter = isGoogleTask;
          break;
        }
        case 'canvas': {
          taskFilter = isCanvasTask;
          break;
        }
      }

      if (taskSection.type === 'campusSolutions' && taskSection.id === 'finaid') {
        incompleteSortingMethod = sortByUpdatedDate;
      } else {
        incompleteSortingMethod = sortByDueDate;
      }

      incompleteSectionTasks = _.clone($scope.lists.incomplete.filter(taskFilter)).sort(incompleteSortingMethod);
      furtherActionNeededTasks = _.remove(incompleteSectionTasks, isCsFurtherActionNeededTask);
      beingProcessedTasks = _.remove(incompleteSectionTasks, isCsBeingProcessedTask);
      incompleteSortedSectionTasks = _.concat(incompleteSectionTasks, furtherActionNeededTasks);

      taskSection.dueWithinWeekCount = incompleteSectionTasks.filter(isDueWithinOneWeekTask).length;

      taskSection.tasks = {
        incomplete: incompleteSortedSectionTasks,
        beingProcessed: beingProcessedTasks,
        completed: $scope.lists.completed.filter(taskFilter).sort(sortByCompletedDateReverse)
      };
    });
  };

  return {
    isCompletedTask: isCompletedTask,
    isCsBeingProcessedTask: isCsBeingProcessedTask,
    isOverdueTask: isOverdueTask,
    updateTaskLists: updateTaskLists
  };
});
