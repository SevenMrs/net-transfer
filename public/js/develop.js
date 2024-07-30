// const aDevice = new RTCPeerConnection();
// const channel = aDevice.createDataChannel();
// channel.onopen = function() {
//     console.log('channel open success!');
// }
// channel.onmessage = function(e) {
//     console.log('new message:', e.data);
// }
// aDevice.createOffer()
//     .then(o => aDevice.setLocalDescription(o))
//     .then(() => console.log('set local description success!'));
//
//
// const bDevice = new RTCPeerConnection();
// bDevice.ondatachannel = function(e) {
//     bDevice.channel = e.channel;
//     bDevice.channel.onmessage = function(e) {
//         console.log(e.data);
//     }
//     bDevice.channel.onopen = function() {
//         console.log('join channel success!');
//     }
// };
// bDevice.setRemoteDescription(offer);
// bDevice.createAnswer()
//     .then(e => bDevice.setLocalDescription(e))
//     .then(() => console.log('set local description success!'));
