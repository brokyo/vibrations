var app = new Vue({
    el: '#app',
    data: {
      hueUserCreated: null,
      lightsFound: false,
      lightArray: [],
      performanceArray: []
    },
    created() {
      fetch('/hue/credential_check').then(response => {
        return response.json()
      }).then(data => {
        this.hueUserCreated = data.userExists
      })
    },
    methods: {
        startHue() {
        fetch('/hue/setup').then(results => {
          return results.json()
        }).then(json => {
          if(json.type === 'error') {
            alert(json.message)
          } else {
            this.hueUserCreated = true
            this.findLights()
          }
        })
        },
      findLights() {
        fetch('/hue/get_lights').then(response => {
          return response.json()
        }).then(json => {
          this.lightArray = []
          
          json.lightArray.forEach(light => {
            let lightObject = {
              id: light._data.id,
              name: light._data.productname,
              position: 0,
            }

            this.lightArray.push(lightObject)
          })
        })
      },
      testLight(id) {
        let postData = {
          lightId: id
        }

        fetch('/hue/test_light', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(postData)
        })
      },
      addToPerformance(index, lightId) {
        this.performanceArray.push(this.lightArray[index])
        this.lightArray = this.lightArray.filter(light => light.id !== lightId)
      },
      removeFromPerformance(index, lightId) {
        this.lightArray.push(this.performanceArray[index])
        this.performanceArray = this.performanceArray.filter(light => light.id!== lightId)
      },
      savePerformanceArray() {
        var postData = {
          array: this.performanceArray
        }

        fetch('/hue/save_array', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(postData)
        }).then(res => {
          alert('Performance lights saved. Moving you to performance.')
          document.location.href = "/play"
        })
      }
    }
  })