'use strict';

var module = angular.module('angularModalService', []);

module.factory('ModalService', ($animate, $document, $compile, $rootScope, $q) => {
  //  Track open modals.
  const openModals = []
  let backdropElement = document.createElement('div')

  return {
    closeModals: closeModals,
    showModal: showModal
  }

  //  Close all modals, providing the given result to the close promise.
  function closeModals (result) {
    openModals.forEach(modal => modal.scope.close(result))
    openModals.length = 0
  }

  function showModal (options) {
    var body = angular.element($document[0].body)
    backdropElement.className = options.backdropClass || 'modal-backdrop'

    if (!options.component) {
      return $q.reject('No component has been specified.')
    }

    let template = document.createElement(options.component)
    template.setAttribute('close', 'close()')

    if (options.wrapper) {
      const wrapper = document.createElement('div')
      wrapper.className = options.wrapperClass || 'modal-wrapper'
      wrapper.appendChild(template)
      template = wrapper
    }

    //  Create a new scope for the modal.
    var modalScope = (options.scope || $rootScope).$new()
    modalScope.close = close

    const rootScopeOnClose = $rootScope.$on('$locationChangeSuccess', closeModals)
    const closedDeferred = $q.defer()

    const modalElement = $compile(template)(modalScope)

    const lastModal = openModals[openModals.length - 1]
    const isFirst = openModals.length === 0
    $animate.enter(modalElement, body, lastModal && lastModal.element)
      .then(() => {
        if (isFirst) { $animate.enter(backdropElement, body, modalElement) }
      })

    // Finally, append any custom classes to the body
    if (options.bodyClass) {
      body[0].classList.add(options.bodyClass)
    }

    let modal = {
      scope: modalScope,
      element: modalElement,
      closed: closedDeferred.promise
    }

    // Clear previous input focus to avoid open multiple modals on enter
    document.activeElement.blur()

    //  We can track this modal in our open modals.
    openModals.push(modal)

    return $q.resolve(modal)

    function close (result) {
      return $animate.leave(modalElement)
        .then(function () {
          //  Resolve the 'closed' promise.
          closedDeferred.resolve(result)

          //  We can now clean up the scope
          modalScope.$destroy()

          //  Remove the modal from the set of open modals.
          for (var i = 0; i < openModals.length; i++) {
            if (openModals[i] === modal) {
              openModals.splice(i, 1)
              break
            }
          }

          //  Remove the custom class from the body
          if (options.bodyClass && openModals.length === 0) {
            body[0].classList.remove(options.bodyClass)
          }

          if (openModals.length === 0) {
            $animate.leave(backdropElement)
            rootScopeOnClose && rootScopeOnClose()
          }

          modal = null
          modalScope = null
        })
    }
  }
})
