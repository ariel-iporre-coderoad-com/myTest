/* sprintf example */
#include <stdio.h>

int main ()
{
  char buffer [1024];
  unsigned int n, a=5;
  unsigned long int b = 4294967296;
  unsigned long long int c = 3375123262;
  n = 0;
  n = sprintf (buffer + n, "uint: %d , ", b);
  //printf("a: %d", n);
  n += sprintf(buffer + n , "ulint: %ld, ", b);
  //printf("b: %d", n);
  n += sprintf(buffer + n, "ullint: %lld, ", b); 
  //printf("c: %d", n);

  printf ("[%s] is a string %d chars long\n",buffer,n);
  return 0;
}
