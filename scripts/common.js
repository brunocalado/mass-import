export class common {
  
  // ---------------------------------------------------------
  // Clean the name 
  static splitPath(str) {
    // Name Cleaning
    let imageName = str.split('\\').pop().split('/').pop(); // remove path
    imageName = imageName.split('.').slice(0, -1).join('.'); // remove extension
    imageName = imageName.replace(/_/g, " ");
    imageName = imageName.replace(/-/g, " ");
    return decodeURI( imageName );
  }
 
}