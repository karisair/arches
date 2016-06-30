define([
    'underscore',
    'backbone',
    'knockout',
    'views/graph/graph-manager/branch-list',
    'bindings/chosen'
], function(_, Backbone, ko, BranchListView) {
    var NodeFormView = Backbone.View.extend({
        /**
        * A backbone view representing a node form
        * @augments Backbone.View
        * @constructor
        * @name NodeFormView
        */

        /**
        * Initializes the view with optional parameters
        * @memberof NodeFormView.prototype
        * @param {object} options
        * @param {object} options.graphModel - a reference to the selected {@link GraphModel}
        * @param {array} options.validations - an array of validation objects
        * @param {array} options.branches - an array of branch objects
        */
        initialize: function(options) {
            var self = this;
            _.extend(this, _.pick(options, 'graphModel', 'validations', 'branches'));
            this.datatypes = _.keys(this.graphModel.get('datatypelookup'));
            this.hasOntolgoy = this.graphModel.get('ontology_id') ? true: false;
            this.node = this.graphModel.get('selectedNode');
            this.closeClicked = ko.observable(false);
            this.loading = options.loading || ko.observable(false);
            this.failed = ko.observable(false);
            this.isResourceTopNode = ko.computed(function() {
                var node = self.node();
                return self.graphModel.get('isresource') && node && node.istopnode;
            });
            this.disableDatatype = ko.computed(function () {
                var node = self.node();
                var isInParentGroup = false;
                if (node) {
                    isInParentGroup = self.graphModel.isNodeInParentGroup(node);
                }
                return self.isResourceTopNode() || isInParentGroup;
            });
            this.disableIsCollector = ko.computed(function () {
                var node = self.node();
                var isCollector = false;
                var isNodeInChildGroup = false;
                var hasNonSemanticParentNodes = false;
                var isInParentGroup = false;
                var groupHasNonSemanticNodes = false;
                var hasDownstreamCollector = false;
                if (node) {
                    isCollector = node.isCollector();
                    isNodeInChildGroup = self.graphModel.isNodeInChildGroup(node);
                    var groupNodes = self.graphModel.getGroupedNodes(node);
                    var childNodes = self.graphModel.getChildNodesAndEdges(node).nodes;
                    childNodes.push(node);
                    var parentGroupNodes = _.difference(groupNodes, childNodes);
                    hasNonSemanticParentNodes = !!_.find(parentGroupNodes, function (node) {
                        return node.datatype() !== 'semantic';
                    });
                    groupHasNonSemanticNodes = !!_.find(groupNodes, function (node) {
                        return node.datatype() !== 'semantic';
                    });
                    var nodeGroupId = node.nodeGroupId();
                    hasDownstreamCollector = !!_.find(childNodes, function (node) {
                        return node.isCollector();
                    });
                    isInParentGroup = self.graphModel.isNodeInParentGroup(node);
                }
                return self.isResourceTopNode() ||
                    (!isCollector && (isNodeInChildGroup || hasNonSemanticParentNodes)) ||
                    (!isCollector && isInParentGroup && hasDownstreamCollector) ||
                    (isCollector && groupHasNonSemanticNodes && (isInParentGroup || isNodeInChildGroup)) ||
                    (self.graphModel.get('nodes')().length > 1 && node && node.istopnode);
            });

            this.branchListView = new BranchListView({
                el: $('#branch-library'),
                branches: ko.observableArray(_.filter(this.branches, function(branch){return branch.isresource === false})),
                graphModel: this.graphModel,
                loading: this.loading,
                disableAppendButton: ko.computed(function () {
                    return self.node() && self.node().dirty();
                })
            });

            this.branchListView.on('close', function(){
                this.$el.find('a[href="#node-form"]').tab('show');
            }, this);

            this.node.subscribe(function () {
                self.closeClicked(false);
            });
        },

        /**
         * Closes the node form view
         * @memberof NodeFormView.prototype
         */
        close: function() {
            this.failed(false);
            this.closeClicked(true);
            if (this.node() && !this.node().dirty()) {
                this.node().selected(false);
            }
        },

        /**
         * Resets the edited model and closes the form
         * @memberof NodeFormView.prototype
         */
        cancel: function () {
            this.node().reset();
            this.close();
        },


        /**
         * Calls an async method on the graph model based on the passed in
         * method name and optionally closes the form on success.
         * Manages showing loading mask & failure alert
         * @memberof NodeFormView.prototype
         *
         * @param  {string} methodName - method to call on the graph model
         */
        callAsync: function (methodName) {
            var self = this
            this.loading(true);
            this.failed(false);
            this.graphModel[methodName](this.node(), function(response, status){
                var success = (status === 'success');
                self.loading(false);
                self.closeClicked(false);
                self.failed(!success);
            });
        },

        /**
         * Calls the updateNode method on the graph model for the edited node
         * @memberof NodeFormView.prototype
         */
        save: function () {
            this.callAsync('updateNode');
        },

        /**
         * Calls the deleteNode method on the graph model for the edited node
         * @memberof NodeFormView.prototype
         */
        deleteNode: function () {
            this.callAsync('deleteNode');
        },

        /**
         * Calls the toggleIsCollector method on the node model
         * @memberof NodeFormView.prototype
         */
        toggleIsCollector: function () {
            this.node().toggleIsCollector();
        }
    });
    return NodeFormView;
});
